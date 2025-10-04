import { useState, useEffect } from 'react'
import { api, CURRENT_USER_ID, Benefit, Membership } from '@/lib/api'

interface BenefitWithMembership extends Benefit {
  membership?: Membership
}

export default function Benefits() {
  const [benefits, setBenefits] = useState<BenefitWithMembership[]>([])
  const [memberships, setMemberships] = useState<Map<number, Membership>>(
    new Map()
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBenefits()
  }, [])

  const loadBenefits = async () => {
    try {
      setLoading(true)
      const [benefitsData, membershipsData] = await Promise.all([
        api.getUserBenefits(CURRENT_USER_ID),
        api.getMemberships(),
      ])

      // Create membership lookup map
      const membershipMap = new Map(
        membershipsData.map(m => [m.id, m])
      )
      setMemberships(membershipMap)

      // Attach membership info to benefits
      const enrichedBenefits = benefitsData.map(benefit => ({
        ...benefit,
        membership: membershipMap.get(benefit.membership_id),
      }))

      setBenefits(enrichedBenefits)
    } catch (error) {
      console.error('Failed to load benefits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Group benefits by membership
  const benefitsByMembership = benefits.reduce((acc, benefit) => {
    const membershipId = benefit.membership_id
    if (!acc[membershipId]) {
      acc[membershipId] = []
    }
    acc[membershipId].push(benefit)
    return acc
  }, {} as Record<number, BenefitWithMembership[]>)

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Your Benefits
      </h1>

      {benefits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">
            You don't have any memberships yet.
          </p>
          <a
            href="/memberships"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Add memberships to see benefits →
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(benefitsByMembership).map(
            ([membershipId, membershipBenefits]) => {
              const membership = memberships.get(Number(membershipId))
              return (
                <div key={membershipId} className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {membership?.name || 'Unknown Membership'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {membershipBenefits.length} benefit
                      {membershipBenefits.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {membershipBenefits.map(benefit => (
                      <div key={benefit.id} className="px-6 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-base font-medium text-gray-900">
                              {benefit.title}
                            </h3>
                            {benefit.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {benefit.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {benefit.category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {benefit.category.replace('_', ' ')}
                                </span>
                              )}
                              {benefit.vendor_domain && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {benefit.vendor_domain}
                                </span>
                              )}
                            </div>
                          </div>
                          {benefit.source_url && (
                            <a
                              href={benefit.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              Learn More
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          )}
        </div>
      )}
    </div>
  )
}

