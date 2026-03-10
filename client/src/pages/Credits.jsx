import React, { useEffect, useState } from 'react'
import Loading from './Loading'
import { useAppContext } from '../context/AppContext'

const Credits = () => {

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const {axios, token} = useAppContext()

  const fetchPlans = async () => {
    try {
      const {data} = await axios.get('/api/credit/plan', {headers: {Authorization: token}})
      if(data.success){
        setPlans(data.plans)
      }
    } catch (error) {
      // silently ignore
    }
    setLoading(false)
  }

  useEffect(()=> {
    fetchPlans()
  }, [])

  if(loading) return <Loading />

  return (
    <div className='max-w-7xl h-screen overflow-y-scroll mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center'>

      {/* Unlimited Usage Banner */}
      <div className='text-center mb-10 xl:mt-30'>
        <div className='inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-600 rounded-full px-5 py-2 mb-4'>
          <span className='text-purple-600 dark:text-purple-300 text-sm font-medium'>✦ Unlimited Usage Active</span>
        </div>
        <h2 className='text-3xl font-semibold text-gray-800 dark:text-white mb-3'>You&apos;re All Set</h2>
        <p className='text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto'>
          Credit deductions are disabled. Your credits are fixed at <span className='font-semibold text-purple-600 dark:text-purple-300'>20,000</span> and will never decrease. Enjoy unlimited text and image generation.
        </p>
      </div>

      {/* Plans shown as reference only — purchasing disabled */}
      <div className='w-full'>
        <p className='text-center text-xs text-gray-400 dark:text-gray-500 mb-6 uppercase tracking-widest'>Plan Reference (Purchasing Disabled)</p>
        <div className='flex flex-wrap justify-center gap-8'>
          {plans.map((plan) => (
            <div key={plan._id} className={`border border-gray-200 dark:border-purple-700 rounded-lg shadow p-6 min-w-[300px] flex flex-col opacity-60 ${plan._id === "pro" ? "bg-purple-50 dark:bg-purple-900" : "bg-white dark:bg-transparent"}`}>
              <div className='flex-1'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>{plan.name}</h3>
                <p className='text-2xl font-bold text-purple-600 dark:text-purple-300 mb-4'>${plan.price}
                  <span className='text-base font-normal text-gray-600 dark:text-purple-200'>{' '}/ {plan.credits} credits</span>
                </p>
                <ul className='list-disc list-inside text-sm text-gray-700 dark:text-purple-200 space-y-1'>
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              {/* Buy Now button disabled — purchasing not available */}
              <button disabled className='mt-6 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium py-2 rounded cursor-not-allowed'>
                Purchasing Disabled
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default Credits
