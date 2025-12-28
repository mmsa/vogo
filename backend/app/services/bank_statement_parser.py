"""Bank statement PDF parser service to extract recurring subscriptions."""

import pdfplumber
import re
import io
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.openai_client import get_openai_client

openai_client = get_openai_client()


def extract_text_from_pdf(pdf_file) -> str:
    """
    Extract all text from a PDF file.
    
    Args:
        pdf_file: File-like object or bytes
        
    Returns:
        Extracted text as string
    """
    text = ""
    try:
        # Convert bytes to file-like object if needed
        if isinstance(pdf_file, bytes):
            pdf_file = io.BytesIO(pdf_file)
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")
    
    return text


def extract_transactions(text: str) -> List[Dict[str, Any]]:
    """
    Extract transaction-like entries from bank statement text.
    
    Looks for patterns like:
    - Date + Description + Amount
    - Recurring monthly charges
    - Subscription payments
    
    Args:
        text: Extracted text from PDF
        
    Returns:
        List of potential transactions with date, description, amount
    """
    transactions = []
    
    # Common date patterns (DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, etc.)
    date_patterns = [
        r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # DD/MM/YYYY or DD-MM-YYYY
        r'\d{1,2}\s+\w{3}\s+\d{4}',  # DD MMM YYYY
        r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',  # YYYY/MM/DD
        r'\d{1,2}\s+\w{3}',  # DD MMM (without year)
    ]
    
    # Amount patterns (currency symbols, negative/positive)
    amount_patterns = [
        r'[£$€]\s*\d+\.\d{2}',  # £12.99, $9.99, €5.00
        r'-\s*[£$€]\s*\d+\.\d{2}',  # -£12.99 (debit)
        r'\d+\.\d{2}\s*[£$€]',  # 12.99£
        r'\(\d+\.\d{2}\)',  # (12.99) negative amount
        r'[£$€]\s*\d+,\d{2}',  # £12,99 (comma decimal)
        r'\d+\.\d{2}',  # Just numbers with decimal (12.99)
        r'\d+,\d{2}',  # Just numbers with comma (12,99)
    ]
    
    lines = text.split('\n')
    
    # Try to find transactions line by line
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or len(line) < 10:
            continue
        
        # Look for date + description + amount pattern
        for date_pattern in date_patterns:
            date_match = re.search(date_pattern, line)
            if date_match:
                for amount_pattern in amount_patterns:
                    amount_match = re.search(amount_pattern, line)
                    if amount_match:
                        # Extract date
                        date_str = date_match.group()
                        
                        # Extract amount
                        amount_str = amount_match.group()
                        # Clean amount - handle both comma and dot decimals
                        amount_clean = re.sub(r'[£$€\s()]', '', amount_str)
                        # Replace comma with dot for decimal
                        amount_clean = amount_clean.replace(',', '.')
                        # Handle negative
                        is_negative = '-' in amount_str or '(' in amount_str
                        amount_clean = amount_clean.replace('-', '')
                        
                        try:
                            amount = float(amount_clean)
                            if is_negative:
                                amount = -amount
                            
                            # Extract description (everything between date and amount)
                            date_end = date_match.end()
                            amount_start = amount_match.start()
                            description = line[date_end:amount_start].strip()
                            
                            # Clean description
                            description = re.sub(r'\s+', ' ', description)
                            
                            if description and len(description) > 2:
                                transactions.append({
                                    'date': date_str,
                                    'description': description,
                                    'amount': abs(amount),  # Use absolute value
                                    'raw_line': line,
                                })
                                break  # Found a match, move to next line
                        except ValueError:
                            pass
    
    # If no transactions found with date patterns, try simpler pattern matching
    # Look for lines with amounts that might be transactions
    if not transactions:
        print("No transactions found with date patterns, trying simpler extraction...")
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 5:
                continue
            
            # Look for amount patterns
            for amount_pattern in amount_patterns:
                amount_match = re.search(amount_pattern, line)
                if amount_match:
                    # Extract amount
                    amount_str = amount_match.group()
                    amount_clean = re.sub(r'[£$€\s()]', '', amount_str)
                    amount_clean = amount_clean.replace(',', '.')
                    is_negative = '-' in amount_str or '(' in amount_str
                    amount_clean = amount_clean.replace('-', '')
                    
                    try:
                        amount = float(amount_clean)
                        if is_negative:
                            amount = -amount
                        
                        # Extract description (everything except the amount)
                        amount_start = amount_match.start()
                        description = line[:amount_start].strip()
                        description = re.sub(r'\s+', ' ', description)
                        
                        # Skip if description is too short or looks like a header
                        if (description and len(description) > 2 and 
                            not description.lower().startswith(('date', 'description', 'amount', 'balance', 'transaction'))):
                            transactions.append({
                                'date': '',
                                'description': description,
                                'amount': abs(amount),
                                'raw_line': line,
                            })
                            break
                    except ValueError:
                        pass
    
    # Debug: print first few lines if no transactions found
    if not transactions:
        print(f"Debug: First 20 lines of extracted text:")
        for i, line in enumerate(lines[:20]):
            print(f"  {i}: {line}")
    
    return transactions


def extract_transactions_with_llm(text: str) -> List[Dict[str, Any]]:
    """
    Use LLM to extract transactions directly from bank statement text.
    More robust than regex patterns as it can handle various formats.
    
    Args:
        text: Extracted text from PDF
        
    Returns:
        List of transactions with date, description, amount
    """
    if not openai_client:
        # Fallback to regex-based extraction
        return extract_transactions(text)
    
    # Limit text to avoid token limits (keep first 8000 chars which should cover most statements)
    text_sample = text[:8000]
    
    prompt = f"""Extract all transactions from this bank statement text. Return ONLY a JSON array of transactions.

Bank Statement Text:
{text_sample}

For each transaction, extract:
- date: The transaction date (any format is fine, keep as-is)
- description: The merchant/service name or transaction description
- amount: The transaction amount (as a positive number, ignore sign)

Return format (JSON array only, no other text):
[
  {{"date": "01/12/2024", "description": "NETFLIX.COM", "amount": 10.99}},
  {{"date": "05/12/2024", "description": "SPOTIFY PREMIUM", "amount": 9.99}},
  ...
]

Only include actual transactions (debits/credits), not headers, balances, or summary lines.
If no transactions found, return empty array []."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a financial data extraction assistant. Extract transactions from bank statements and return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for consistent extraction
            max_tokens=2000,
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        # Remove markdown code blocks if present
        if result_text.startswith("```"):
            result_text = re.sub(r'^```json\n?', '', result_text)
            result_text = re.sub(r'\n?```$', '', result_text)
            result_text = result_text.strip()
        
        transactions = json.loads(result_text)
        
        if isinstance(transactions, list):
            # Validate and clean transactions
            cleaned = []
            for txn in transactions:
                if isinstance(txn, dict) and 'description' in txn and 'amount' in txn:
                    try:
                        amount = float(txn['amount'])
                        if amount > 0:  # Only positive amounts
                            cleaned.append({
                                'date': txn.get('date', ''),
                                'description': str(txn['description']).strip(),
                                'amount': amount,
                                'raw_line': f"{txn.get('date', '')} {txn['description']} {amount}",
                            })
                    except (ValueError, TypeError):
                        pass
            return cleaned
        else:
            return []
            
    except Exception as e:
        print(f"LLM extraction failed: {e}, falling back to regex")
        # Fallback to regex-based extraction
        return extract_transactions(text)


def identify_subscriptions_with_llm(
    transactions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Use LLM to identify which transactions are recurring subscriptions.
    
    Args:
        transactions: List of extracted transactions
        
    Returns:
        List of identified subscriptions with membership names
    """
    if not openai_client:
        # Fallback: simple pattern matching
        return _identify_subscriptions_simple(transactions)
    
    # Group transactions by description similarity
    # Prepare prompt for LLM
    transaction_text = "\n".join([
        f"- {t['date']}: {t['description']} - £{t['amount']:.2f}"
        for t in transactions[:50]  # Limit to first 50 for cost
    ])
    
    prompt = f"""Analyze these bank statement transactions and identify recurring monthly subscriptions.

Transactions:
{transaction_text}

For each transaction that looks like a recurring subscription (Netflix, Spotify, Amazon Prime, gym memberships, insurance, etc.), identify:
1. The membership/service name (e.g., "Netflix", "Spotify Premium", "Amazon Prime")
2. Whether it's likely recurring (monthly/annual)
3. The amount

Return as JSON array:
[
  {{
    "membership_name": "Netflix",
    "amount": 10.99,
    "frequency": "monthly",
    "confidence": 0.9,
    "transaction_description": "NETFLIX.COM"
  }},
  ...
]

Only include transactions that are clearly subscriptions/memberships. Exclude:
- One-time purchases
- Transfers
- Refunds
- Utility bills (unless they're subscription-based like phone plans)
- Groceries or shopping

Return ONLY valid JSON, no other text."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a financial assistant that identifies recurring subscriptions from bank statements. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        # Remove markdown code blocks if present
        if result_text.startswith("```"):
            result_text = re.sub(r'^```json\n?', '', result_text)
            result_text = re.sub(r'\n?```$', '', result_text)
        
        subscriptions = json.loads(result_text)
        
        if isinstance(subscriptions, list):
            return subscriptions
        else:
            return []
            
    except Exception as e:
        print(f"LLM identification failed: {e}")
        # Fallback to simple matching
        return _identify_subscriptions_simple(transactions)


def _identify_subscriptions_simple(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Simple pattern-based subscription identification as fallback."""
    subscriptions = []
    
    # Common subscription keywords
    subscription_keywords = [
        'netflix', 'spotify', 'amazon prime', 'disney', 'apple', 'google',
        'microsoft', 'adobe', 'gym', 'fitness', 'insurance', 'premium',
        'subscription', 'membership', 'monthly', 'annual', 'yearly',
        'recurring', 'auto-renew', 'auto pay'
    ]
    
    for transaction in transactions:
        desc_lower = transaction['description'].lower()
        
        # Check if description contains subscription keywords
        if any(keyword in desc_lower for keyword in subscription_keywords):
            # Try to extract membership name
            membership_name = transaction['description']
            # Clean up common prefixes/suffixes
            membership_name = re.sub(r'^(PAYMENT|DD|DIRECT DEBIT|STANDING ORDER|SO)\s+', '', membership_name, flags=re.IGNORECASE)
            membership_name = re.sub(r'\s+(LTD|LIMITED|INC|LLC|UK|GB|COM)$', '', membership_name, flags=re.IGNORECASE)
            membership_name = membership_name.strip()
            
            if membership_name:
                subscriptions.append({
                    'membership_name': membership_name,
                    'amount': transaction['amount'],
                    'frequency': 'monthly',  # Default assumption
                    'confidence': 0.6,  # Lower confidence for simple matching
                    'transaction_description': transaction['description'],
                })
    
    return subscriptions


def parse_bank_statement(pdf_file) -> Dict[str, Any]:
    """
    Main function to parse a bank statement PDF and extract subscriptions.
    
    Uses LLM to extract transactions and identify subscriptions in one pass for efficiency.
    
    Args:
        pdf_file: File-like object or bytes of PDF
        
    Returns:
        Dictionary with:
        - transactions: List of all transactions
        - subscriptions: List of identified subscriptions
        - summary: Summary statistics
    """
    # Extract text
    text = extract_text_from_pdf(pdf_file)
    
    if not text or len(text) < 100:
        raise ValueError("PDF appears to be empty or unreadable")
    
    # Use LLM to extract transactions AND identify subscriptions in one call (more efficient)
    if openai_client:
        subscriptions = extract_subscriptions_directly_with_llm(text)
        # Extract all transactions for summary (use simpler extraction)
        transactions = extract_transactions_with_llm(text)
    else:
        # Fallback: extract transactions first, then identify subscriptions
        transactions = extract_transactions(text)
        if not transactions:
            raise ValueError("No transactions found in bank statement")
        subscriptions = identify_subscriptions_with_llm(transactions)
    
    if not subscriptions and not transactions:
        raise ValueError("No transactions found in bank statement")
    
    # Calculate summary
    total_subscriptions = sum(s['amount'] for s in subscriptions)
    
    return {
        'transactions': transactions if transactions else [],
        'subscriptions': subscriptions,
        'summary': {
            'total_transactions': len(transactions) if transactions else 0,
            'subscriptions_found': len(subscriptions),
            'monthly_subscription_cost': total_subscriptions,
            'annual_subscription_cost': total_subscriptions * 12,
        }
    }


def extract_subscriptions_directly_with_llm(text: str) -> List[Dict[str, Any]]:
    """
    Use LLM to extract subscriptions directly from bank statement text in one pass.
    More efficient than extracting all transactions then filtering.
    
    Args:
        text: Extracted text from PDF
        
    Returns:
        List of identified subscriptions
    """
    if not openai_client:
        return []
    
    # Limit text to avoid token limits
    text_sample = text[:8000]
    
    prompt = f"""Analyze this bank statement and extract ONLY recurring monthly/annual subscriptions.

Bank Statement Text:
{text_sample}

For each transaction that is clearly a recurring subscription (Netflix, Spotify, Amazon Prime, gym memberships, insurance premiums, phone plans, etc.), extract:
- membership_name: The service/membership name (e.g., "Netflix", "Spotify Premium", "Amazon Prime")
- amount: The monthly/annual cost (as a positive number)
- frequency: "monthly" or "annual"
- confidence: Your confidence level (0.0 to 1.0)

Exclude:
- One-time purchases
- Transfers
- Refunds
- Utility bills (unless subscription-based like phone plans)
- Groceries or shopping
- ATM withdrawals
- Bank fees (unless they're subscription-based)

Return format (JSON array only, no other text):
[
  {{"membership_name": "Netflix", "amount": 10.99, "frequency": "monthly", "confidence": 0.95}},
  {{"membership_name": "Spotify Premium", "amount": 9.99, "frequency": "monthly", "confidence": 0.9}},
  ...
]

If no subscriptions found, return empty array []."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a financial assistant that identifies recurring subscriptions from bank statements. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,  # Low temperature for consistent extraction
            max_tokens=2000,
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        # Remove markdown code blocks if present
        if result_text.startswith("```"):
            result_text = re.sub(r'^```json\n?', '', result_text)
            result_text = re.sub(r'\n?```$', '', result_text)
            result_text = result_text.strip()
        
        subscriptions = json.loads(result_text)
        
        if isinstance(subscriptions, list):
            # Validate and clean subscriptions
            cleaned = []
            for sub in subscriptions:
                if isinstance(sub, dict) and 'membership_name' in sub and 'amount' in sub:
                    try:
                        amount = float(sub['amount'])
                        confidence = float(sub.get('confidence', 0.7))
                        if amount > 0 and confidence >= 0.5:  # Only include confident matches
                            cleaned.append({
                                'membership_name': str(sub['membership_name']).strip(),
                                'amount': amount,
                                'frequency': sub.get('frequency', 'monthly'),
                                'confidence': confidence,
                                'transaction_description': sub.get('transaction_description', sub['membership_name']),
                            })
                    except (ValueError, TypeError):
                        pass
            return cleaned
        else:
            return []
            
    except Exception as e:
        print(f"LLM direct subscription extraction failed: {e}")
        # Fallback: extract transactions then identify subscriptions
        transactions = extract_transactions(text)
        return identify_subscriptions_with_llm(transactions) if transactions else []


