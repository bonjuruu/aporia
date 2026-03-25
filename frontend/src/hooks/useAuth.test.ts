import { renderHook, waitFor, act } from '@testing-library/react'
import { login as apiLogin, register as apiRegister, logout as apiLogout, fetchMe, UnauthorizedError } from '../api/client'
import { buildAuthUser } from '../test/factories'
import { useAuth } from './useAuth'

vi.mock('../api/client')

const fetchMeMock = vi.mocked(fetchMe)
const apiLoginMock = vi.mocked(apiLogin)
const apiRegisterMock = vi.mocked(apiRegister)
const apiLogoutMock = vi.mocked(apiLogout)

describe('useAuth', () => {
  it('should load user on mount via fetchMe', async () => {
    const authUser = buildAuthUser()
    fetchMeMock.mockResolvedValue(authUser)

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(authUser)
    expect(result.current.error).toBeNull()
    expect(fetchMeMock).toHaveBeenCalledTimes(1)
  })

  it('should set user to null without error on UnauthorizedError', async () => {
    fetchMeMock.mockRejectedValue(new UnauthorizedError())

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should set error state on network error', async () => {
    fetchMeMock.mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBe('Network failure')
  })

  it('should call apiLogin then trigger refetch via fetchCount increment', async () => {
    const authUser = buildAuthUser()
    fetchMeMock.mockResolvedValue(authUser)
    apiLoginMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    fetchMeMock.mockClear()

    await act(async () => {
      await result.current.login('philosopher@academy.edu', 'password123')
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(apiLoginMock).toHaveBeenCalledWith('philosopher@academy.edu', 'password123')
    expect(fetchMeMock).toHaveBeenCalledTimes(1)
  })

  it('should call apiRegister then trigger refetch', async () => {
    const authUser = buildAuthUser()
    fetchMeMock.mockResolvedValue(authUser)
    apiRegisterMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    fetchMeMock.mockClear()

    await act(async () => {
      await result.current.register('philosopher@academy.edu', 'password123')
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(apiRegisterMock).toHaveBeenCalledWith('philosopher@academy.edu', 'password123')
    expect(fetchMeMock).toHaveBeenCalledTimes(1)
  })

  it('should clear user on logout even if API call fails', async () => {
    const authUser = buildAuthUser()
    fetchMeMock.mockResolvedValue(authUser)
    apiLogoutMock.mockRejectedValue(new Error('Server unreachable'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual(authUser)
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should clear user on aporia:unauthorized event', async () => {
    const authUser = buildAuthUser()
    fetchMeMock.mockResolvedValue(authUser)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual(authUser)
    })

    act(() => {
      window.dispatchEvent(new Event('aporia:unauthorized'))
    })

    expect(result.current.user).toBeNull()
  })
})
