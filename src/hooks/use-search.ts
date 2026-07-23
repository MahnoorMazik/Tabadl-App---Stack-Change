import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

interface UseSearchOptions {
  endpoint: string
  token: string
  minLength?: number
  debounceMs?: number
  searchFields?: string[]
  initialLoad?: boolean // Whether to load data on initial mount
}

interface UseSearchReturn<T> {
  data: T[]
  loading: boolean
  error: string | null
  search: string
  setSearch: (search: string) => void
  refetch: () => void
}

export function useSearch<T>({
  endpoint,
  token,
  minLength = 3,
  debounceMs = 300,
  searchFields = [],
  initialLoad = true
}: UseSearchOptions): UseSearchReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const lastSearchRef = useRef<string>('')

  // Debounce search input with improved logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [search, debounceMs])

  // Fetch data when debounced search changes
  const fetchData = useCallback(async (searchTerm: string, isInitialLoad = false) => {
    if (!endpoint) return
    
    // Note: NextAuth uses cookies for authentication, so token may be null
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null)
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      // Add search parameter if it meets minimum length OR if it's an initial load
      if (searchTerm.length >= minLength || isInitialLoad) {
        if (searchTerm.length > 0) {
          params.append('search', searchTerm)
        }
      }

      // Add search fields if specified
      if (searchFields.length > 0) {
        params.append('searchFields', searchFields.join(','))
      }

      const url = `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await axios.get(url, {
        headers
      })

      // Handle structured response format - check for various properties
      let leads: T[] = []
      // Check structured response format first (success: true, data: {...})
      if (response.data?.success && response.data?.data) {
        const dataObj = response.data.data
        if (dataObj?.leads) {
          leads = Array.isArray(dataObj.leads) ? dataObj.leads : []
          console.log('useSearch: Found data.leads property, count:', leads.length)
        } else if (dataObj?.clients) {
          leads = Array.isArray(dataObj.clients) ? dataObj.clients : []
          console.log('useSearch: Found data.clients property, count:', leads.length)
        } else if (dataObj?.applications) {
          leads = Array.isArray(dataObj.applications) ? dataObj.applications : []
          console.log('useSearch: Found data.applications property, count:', leads.length)
        } else if (Array.isArray(dataObj)) {
          leads = dataObj as T[]
          console.log('useSearch: Found data as array, count:', leads.length)
        }
      } else if (response.data?.leads) {
        // API returns { leads: [...] }
        leads = Array.isArray(response.data.leads) ? response.data.leads : []
        console.log('useSearch: Found leads property, count:', leads.length)
      } else if (response.data?.clients) {
        // API returns { clients: [...] }
        leads = Array.isArray(response.data.clients) ? response.data.clients : []
        console.log('useSearch: Found clients property, count:', leads.length)
      } else if (response.data?.applications) {
        // API returns { applications: [...] }
        leads = Array.isArray(response.data.applications) ? response.data.applications : []
        console.log('useSearch: Found applications property, count:', leads.length)
      } else if (response.data?.data?.applications) {
        // API returns { data: { applications: [...] } }
        leads = Array.isArray(response.data.data.applications) ? response.data.data.applications : []
        console.log('useSearch: Found data.applications property, count:', leads.length)
      } else if (response.data?.data?.clients) {
        // API returns { data: { clients: [...] } }
        leads = Array.isArray(response.data.data.clients) ? response.data.data.clients : []
        console.log('useSearch: Found data.clients property, count:', leads.length)
      } else if (response.data?.data) {
        // API returns { data: [...] }
        leads = Array.isArray(response.data.data) ? response.data.data : []
        console.log('useSearch: Found data property, count:', leads.length)
      } else if (Array.isArray(response.data)) {
        // API returns [...] directly
        leads = response.data as T[]
        console.log('useSearch: Direct array response, count:', leads.length)
      }
      
      console.log('useSearch: Setting data with', leads.length, 'items')
      setData(leads)
    } catch (err: any) {
      console.error('Search error:', err)
      setError(err.response?.data?.message || 'Search failed')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [endpoint, token, minLength, searchFields])

  // Fetch data on initial load and when search meets minimum length
  useEffect(() => {
    console.log('useSearch: useEffect triggered', {
      token: !!token,
      initialLoad,
      hasInitiallyLoaded,
      debouncedSearch,
      minLength,
      endpoint
    })

    if (!token) {
      console.log('useSearch: No token, skipping')
      return
    }

    // Check if this is initial load
    const isInitialLoad = initialLoad && !hasInitiallyLoaded
    // Check if this is a search query that meets minimum length OR if search is cleared (empty)
    const isSearchQuery = debouncedSearch.length >= minLength && debouncedSearch.length > 0
    const isClearedSearch = debouncedSearch.length === 0
    
    console.log('useSearch: Conditions', { 
      isInitialLoad, 
      isSearchQuery, 
      isClearedSearch,
      initialLoad, 
      hasInitiallyLoaded, 
      debouncedSearchLength: debouncedSearch.length,
      minLength 
    })
    
    // Only fetch if it's initial load OR if it's a valid search query OR if search is cleared
    if (isInitialLoad || isSearchQuery || isClearedSearch) {
      // For initial load, don't check for duplicates - always fetch
      // For search queries and cleared searches, prevent duplicate requests
      if (!isInitialLoad && lastSearchRef.current === debouncedSearch) {
        console.log('useSearch: Duplicate request, skipping')
        return
      }
      
      lastSearchRef.current = debouncedSearch
      
      console.log('useSearch: Fetching data', { isInitialLoad, isSearchQuery, debouncedSearch, endpoint })
      
      // Add a small delay for initial load to prevent race conditions
      const timeoutId = setTimeout(() => {
        fetchData(debouncedSearch, isInitialLoad)
        if (isInitialLoad) {
          setHasInitiallyLoaded(true)
        }
      }, isInitialLoad ? 100 : 0) // Small delay only for initial load
      
      return () => clearTimeout(timeoutId)
    } else {
      console.log('useSearch: No fetch needed', { isInitialLoad, isSearchQuery })
    }
  }, [fetchData, debouncedSearch, minLength, token, hasInitiallyLoaded, initialLoad])

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    fetchData(debouncedSearch, false)
  }, [fetchData, debouncedSearch])

  return {
    data,
    loading,
    error,
    search,
    setSearch,
    refetch
  }
}
