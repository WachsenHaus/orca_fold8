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

  async function flushFrames(milliseconds = 100): Promise<void> {
    await act(async () => {
      vi.advanceTimersByTime(milliseconds)
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

  it('coalesces updates into one pending correction chain', async () => {
    const follow = await mount()

    act(() => {
      follow.pinToTailAfterContentResize(320, 900)
      follow.pinToTailAfterContentResize(320, 960)
    })
    expect(scrollToOffset).toHaveBeenCalledTimes(2)

    expect(vi.getTimerCount()).toBe(1)
    await flushFrames(32)

    expect(scrollToOffset).toHaveBeenCalledTimes(3)
    expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: false, offset: 960 })
    expect(scrollToEnd).not.toHaveBeenCalled()
    await flushFrames()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('corrects the final resize even when the earlier correction precedes its mount', async () => {
    const follow = await mount()
    let mountedHeight = 900
    let nativeOffset = 0
    scrollToOffset.mockImplementation(({ offset }: { offset: number }) => {
      nativeOffset = Math.min(offset, mountedHeight)
    })

    act(() => follow.pinToTailAfterContentResize(320, 900))
    await flushFrames(16)
    act(() => follow.pinToTailAfterContentResize(320, 960))
    await flushFrames(16)
    expect(nativeOffset).toBe(900)

    mountedHeight = 960
    await flushFrames(32)
    expect(nativeOffset).toBe(960)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps correcting during continuous updates and settles after the last one', async () => {
    const follow = await mount()
    act(() => follow.pinToTailAfterContentResize(320, 900))

    for (let frame = 1; frame <= 6; frame++) {
      await flushFrames(16)
      expect(scrollToOffset).toHaveBeenCalledTimes(frame + Math.floor(frame / 2))
      act(() => follow.pinToTailAfterContentResize(320, 900 + frame * 60))
      expect(vi.getTimerCount()).toBe(1)
    }

    await flushFrames()
    expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: false, offset: 1_260 })
    expect(vi.getTimerCount()).toBe(0)
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
    expect(vi.getTimerCount()).toBe(1)
    act(() => follow.beginUserScroll())
    expect(vi.getTimerCount()).toBe(0)
    await flushFrames()

    expect(scrollToOffset).toHaveBeenCalledOnce()
  })

  it.each(['drag', 'history', 'unmount'] as const)(
    'cancels a repeated correction on %s',
    async (action) => {
      const follow = await mount()
      act(() => follow.pinToTailAfterContentResize(320, 900))
      await flushFrames(16)
      act(() => follow.pinToTailAfterContentResize(320, 960))
      await flushFrames(32)
      expect(vi.getTimerCount()).toBe(1)
      scrollToOffset.mockClear()

      act(() => {
        if (action === 'drag') {
          follow.beginUserScroll()
        }
        if (action === 'history') {
          follow.detachFromTail()
        }
        if (action === 'unmount') {
          renderer?.unmount()
          renderer = null
        }
      })

      expect(vi.getTimerCount()).toBe(0)
      await flushFrames()
      expect(scrollToOffset).not.toHaveBeenCalled()
    }
  )

  it('leaves platforms that mount first to the single immediate pin', async () => {
    mountOrder.SCROLL_COMMAND_PRECEDES_MOUNT = false
    const follow = await mount()

    act(() => follow.pinToTailAfterContentResize(320, 900))
    await flushFrames()

    expect(scrollToOffset).toHaveBeenCalledOnce()
  })
})
