/**
 * Debug component to show current user info and auth state
 */
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DebugInfo() {
  const { user, accessToken, isAuthenticated } = useAuth();

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Authentication Status:</h3>
            <Badge variant={isAuthenticated ? "default" : "destructive"}>
              {isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}
            </Badge>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Current User:</h3>
            {user ? (
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 space-y-2 font-mono text-sm">
                <p><span className="font-bold">ID:</span> {user.id}</p>
                <p><span className="font-bold">Email:</span> {user.email}</p>
                <p><span className="font-bold">Role:</span> <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>{user.role}</Badge></p>
                <p><span className="font-bold">Active:</span> {user.is_active ? "✅ Yes" : "❌ No"}</p>
                <p><span className="font-bold">Created:</span> {user.created_at}</p>
              </div>
            ) : (
              <p className="text-zinc-500">No user data loaded</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Access Token:</h3>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 font-mono text-xs break-all">
              {accessToken ? (
                <>
                  <p className="mb-2">{accessToken.substring(0, 50)}...</p>
                  <Badge variant="outline">Token present</Badge>
                </>
              ) : (
                <p className="text-zinc-500">No token</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">LocalStorage:</h3>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 font-mono text-xs">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(JSON.parse(localStorage.getItem('vogoplus-auth') || localStorage.getItem('vogplus-auth') || '{}'), null, 2)}
              </pre>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Quick Actions:</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  fetch('/api/dev/whoami', {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`
                    }
                  })
                    .then(r => r.json())
                    .then(data => {
                      console.log('whoami response:', data);
                      alert(JSON.stringify(data, null, 2));
                    })
                    .catch(err => {
                      console.error('whoami error:', err);
                      alert('Error: ' + err.message);
                    });
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test /api/dev/whoami
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Make yourself admin? (You will need to log out and back in)')) {
                    fetch('/api/dev/make-me-admin', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${accessToken}`
                      }
                    })
                      .then(r => r.json())
                      .then(data => {
                        console.log('make-me-admin response:', data);
                        alert(data.message);
                      })
                      .catch(err => {
                        console.error('make-me-admin error:', err);
                        alert('Error: ' + err.message);
                      });
                  }
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Make Me Admin
              </button>

              <button
                onClick={() => {
                  if (confirm('This will log you out. Continue?')) {
                    localStorage.removeItem('vogoplus-auth');
                    localStorage.removeItem('vogplus-auth'); // Remove old key too
                    window.location.href = '/login';
                  }
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Force Logout & Clear Session
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

