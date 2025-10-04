import { useState, useEffect } from 'react'
import { api, CURRENT_USER_ID, Recommendation, Benefit } from '@/lib/api'

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [relevantBenefits, setRelevantBenefits] = useState<Benefit[]>([])
  const [loading, setLoading] = useState(true)
  const [aiMode, setAiMode] = useState(false)
  
  // Cache for instant toggle switching
  const [cachedRuleBased, setCachedRuleBased] = useState<Recommendation[] | null>(null)
  const [cachedAI, setCachedAI] = useState<{recs: Recommendation[], benefits: Benefit[]} | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [aiMode])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      if (aiMode) {
        // Check cache first
        if (cachedAI) {
          setRecommendations(cachedAI.recs)
          setRelevantBenefits(cachedAI.benefits)
          setLoading(false)
          return
        }
        // Use LLM-powered recommendations
        const data = await api.getLLMRecommendations({ user_id: CURRENT_USER_ID })
        setRecommendations(data.recommendations)
        setRelevantBenefits(data.relevant_benefits)
        setCachedAI({ recs: data.recommendations, benefits: data.relevant_benefits })
      } else {
        // Check cache first
        if (cachedRuleBased) {
          setRecommendations(cachedRuleBased)
          setRelevantBenefits([])
          setLoading(false)
          return
        }
        // Use rule-based recommendations
        const data = await api.getRecommendations(CURRENT_USER_ID)
        setRecommendations(data)
        setRelevantBenefits([])
        setCachedRuleBased(data)
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Recommendations
            </h1>
            <p className="text-gray-600">
              Personalized tips to help you get the most from your memberships
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow">
            <span className={`text-sm font-medium ${!aiMode ? 'text-indigo-600' : 'text-gray-500'}`}>
              Rule-based
            </span>
            <button
              disabled
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors opacity-50 cursor-not-allowed ${
                aiMode ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${aiMode ? 'text-indigo-600' : 'text-gray-500'}`}>
                AI Mode
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                GPT-4o
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center h-64 bg-white rounded-lg shadow">
          {aiMode ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-700 font-medium">Analyzing with GPT-4o...</p>
              <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mb-4"></div>
              <p className="text-gray-500">Loading recommendations...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recommendations
          </h1>
          <p className="text-gray-600">
            Personalized tips to help you get the most from your memberships
          </p>
        </div>
        
        {/* AI Mode Toggle */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow">
          <span className={`text-sm font-medium ${!aiMode ? 'text-indigo-600' : 'text-gray-500'}`}>
            Rule-based
          </span>
          <button
            onClick={() => setAiMode(!aiMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              aiMode ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                aiMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${aiMode ? 'text-indigo-600' : 'text-gray-500'}`}>
              AI Mode
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              GPT-4o
            </span>
          </div>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">
            No recommendations available yet.
          </p>
          <a
            href="/memberships"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Add memberships to get personalized recommendations →
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {recommendations.map((rec, index) => {
              const kindColors = {
                overlap: 'bg-yellow-50 border-yellow-200',
                unused: 'bg-blue-50 border-blue-200',
                switch: 'bg-purple-50 border-purple-200',
                bundle: 'bg-green-50 border-green-200',
                tip: 'bg-indigo-50 border-indigo-200'
              }
              
              const kindIcons = {
                overlap: '⚠️',
                unused: '💡',
                switch: '🔄',
                bundle: '📦',
                tip: '✨'
              }
              
              return (
                <div
                  key={index}
                  className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow border ${
                    aiMode && rec.kind ? kindColors[rec.kind as keyof typeof kindColors] : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">
                          {aiMode && rec.kind ? kindIcons[rec.kind as keyof typeof kindIcons] : '⭐'}
                        </span>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {rec.title}
                          </h3>
                          {aiMode && rec.kind && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {rec.kind}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {rec.rationale}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="space-y-1">
                            {(rec.estimated_saving || (rec.estimated_saving_min && rec.estimated_saving_max)) && (
                              <p className="text-sm font-medium text-green-600">
                                💰 {rec.estimated_saving || 
                                  (rec.estimated_saving_min && rec.estimated_saving_max 
                                    ? `£${(rec.estimated_saving_min / 100).toFixed(0)}-${(rec.estimated_saving_max / 100).toFixed(0)}/year`
                                    : 'Savings available')}
                              </p>
                            )}
                            {(rec.membership || rec.membership_slug) && (
                              <p className="text-xs text-gray-500">
                                via {rec.membership || rec.membership_slug}
                              </p>
                            )}
                          </div>
                          {rec.action_url && (
                            <a
                              href={rec.action_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              Take Action
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Relevant Benefits Section (AI Mode Only) */}
          {aiMode && relevantBenefits.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Relevant Benefits for You
              </h2>
              <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                {relevantBenefits.map((benefit) => (
                  <div key={benefit.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-medium text-gray-900">
                          {benefit.title}
                        </h3>
                        {benefit.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {benefit.description}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          {benefit.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              {benefit.category.replace('_', ' ')}
                            </span>
                          )}
                          {benefit.vendor_domain && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
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
                          className="ml-4 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Learn More →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

