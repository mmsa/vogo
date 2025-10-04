import { useState, useEffect } from 'react'
import { api, CURRENT_USER_ID, Membership, SmartAddOut } from '@/lib/api'

export default function Memberships() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [smartCheck, setSmartCheck] = useState<SmartAddOut | null>(null)
  const [checkingMembership, setCheckingMembership] = useState<number | null>(null)

  useEffect(() => {
    loadMemberships()
  }, [])

  const loadMemberships = async () => {
    try {
      setLoading(true)
      const data = await api.getMemberships()
      setMemberships(data)
    } catch (error) {
      console.error('Failed to load memberships:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMemberships = async () => {
    try {
      setAdding(true)
      await Promise.all(
        selectedMemberships.map(membershipId =>
          api.addUserMembership(CURRENT_USER_ID, membershipId)
        )
      )
      setShowModal(false)
      setSelectedMemberships([])
      alert('Memberships added successfully!')
    } catch (error) {
      console.error('Failed to add memberships:', error)
      alert('Failed to add memberships')
    } finally {
      setAdding(false)
    }
  }

  const toggleMembership = async (id: number) => {
    // If unchecking, just remove
    if (selectedMemberships.includes(id)) {
      setSelectedMemberships(prev => prev.filter(m => m !== id))
      setSmartCheck(null)
      return
    }

    // Run smart check when selecting
    const membership = memberships.find(m => m.id === id)
    if (!membership) return

    setCheckingMembership(id)
    try {
      const check = await api.smartAddCheck({
        user_id: CURRENT_USER_ID,
        candidate_membership_slug: membership.provider_slug
      })
      
      setSmartCheck(check)
      
      // Auto-add if decision is "add"
      if (check.decision === 'add') {
        setSelectedMemberships(prev => [...prev, id])
      }
    } catch (error) {
      console.error('Smart check failed:', error)
      // On error, just add it
      setSelectedMemberships(prev => [...prev, id])
    } finally {
      setCheckingMembership(null)
    }
  }

  const forceAddAfterWarning = () => {
    if (smartCheck && checkingMembership) {
      setSelectedMemberships(prev => [...prev, checkingMembership])
      setSmartCheck(null)
      setCheckingMembership(null)
    }
  }

  const dismissWarning = () => {
    setSmartCheck(null)
    setCheckingMembership(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Memberships</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add Memberships
        </button>
      </div>

      {/* Memberships Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {memberships.map(membership => (
          <div
            key={membership.id}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {membership.name}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {membership.provider_slug}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Memberships Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Add Memberships
                </h3>
                
                {/* Smart Check Warning */}
                {smartCheck && smartCheck.decision !== 'add' && (
                  <div className={`mb-4 p-4 rounded-md ${
                    smartCheck.decision === 'already_covered'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {smartCheck.decision === 'already_covered' ? (
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {smartCheck.decision === 'already_covered' ? 'Already Covered' : 'Better Alternative Available'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-700">
                          {smartCheck.explanation}
                        </p>
                        {smartCheck.impacted_benefits.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700">Overlapping benefits:</p>
                            <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                              {smartCheck.impacted_benefits.slice(0, 3).map((benefit, idx) => (
                                <li key={idx}>{benefit.title}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {smartCheck.alternatives.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700">Suggested:</p>
                            <ul className="mt-1 text-xs text-gray-600">
                              {smartCheck.alternatives.map((alt, idx) => (
                                <li key={idx}>{alt.membership_slug}: {alt.reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={forceAddAfterWarning}
                            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Add Anyway
                          </button>
                          <button
                            onClick={dismissWarning}
                            className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {memberships.map(membership => (
                    <label
                      key={membership.id}
                      className={`flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer ${
                        checkingMembership === membership.id ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberships.includes(membership.id)}
                        onChange={() => toggleMembership(membership.id)}
                        disabled={checkingMembership === membership.id}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        {membership.name}
                        {checkingMembership === membership.id && (
                          <span className="ml-2 text-xs text-gray-500">(checking...)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={adding || selectedMemberships.length === 0}
                  onClick={handleAddMemberships}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Selected'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

