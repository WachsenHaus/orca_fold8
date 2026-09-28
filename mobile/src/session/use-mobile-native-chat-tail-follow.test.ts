import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useMobileNativeChatTailFollow,
  type MobileNativeChatTailFollow
} from './use-mobile-native-chat-tail-follow'

const mountOrder = vi.hoisted(() => ({ SCROLL_COMMAND_PRECEDES_MOUNT: true }))

vi.mock('./native-chat-scroll-mount-order', () => mountOrder)

describe('useMobileNativeChatTailFollow', () => {
  let renderer: ReactTestRenderer | null = null
  let tail: MobileNativeChatTailFollow<string> | null = null
  const scrollToEnd = vi.fn()
  const scrollToOffset = vi.fn()

  function Harness(): null {
    tail = useMobileNativeChatTailFollow<string>({ hasItems: true })
    return null
  }

  async function mount(): Promise<MobileNativeChatTailFollow<string>> {
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    Object.assign(tail!.listRef, { current: { scrollToEnd, scrollToOffset } })
    return tail!
  }

  async function flushFrames(): Promise<void> {
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => callback(0), 16)
    )
    vi.stubGlobal('cancelAnimationFrame', (handle: ReturnType<typeof setTimeout>) =>
      clearTimeout(handle)
    )
    mountOrder.SCROLL_COMMAND_PRECEDES_MOUNT = true
  })

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    tail = null
    scrollToEnd.mockReset()
    scrollToOffset.mockReset()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('re-pins once to the latest height after the grown content mounts', async () => {
    const follow = await mount()

    act(() => {
      follow.pinToTailAfterContentResize(320, 900)
      follow.pinToTailAfterContentResize(320, 960)
    })
    expect(scrollToOffset).toHaveBeenCalledTimes(2)

    await flushFrames()

    expect(scrollToOffset).toHaveBeenCalledTimes(3)
    expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: false, offset: 960 })
    expect(scrollToEnd).not.toHaveBeenCalled()
  })

  it('settles a viewport pin on the measured content height', async () => {
    const follow = await mount()
    act(() => follow.pinToTailAfterContentResize(320, 1_200))
    await flushFrames()
    scrollToOffset.mockClear()

    act(() => follow.pinToTail())
    expect(scrollToEnd).toHaveBeenCalledOnce()
    await flushFrames()

    expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: false, offset: 1_200 })
  })

  it('drops a pending settle pin once the user starts dragging', async () => {
    const follow = await mount()

    act(() => follow.pinToTailAfterContentResize(320, 900))
    act(() => follow.beginUserScroll())
    await flushFrames()

    expect(scrollToOffset).toHaveBeenCalledOnce()
  })

  it('leaves platforms that mount first to the single immediate pin', async () => {
    mountOrder.SCROLL_COMMAND_PRECEDES_MOUNT = false
    const follow = await mount()

    act(() => follow.pinToTailAfterContentResize(320, 900))
    await flushFrames()

    expect(scrollToOffset).toHaveBeenCalledOnce()
  })
})
