import { useEffect, useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { Skeleton } from './Skeleton'

type LoadState = 'loading' | 'ready' | 'error'

/**
 * 图片容器，完整实现三态：
 * - loading：骨架微光，形状与最终图片一致，无布局跳动
 * - ready  ：照片做统一冷调处理（降饱和 + 强调色叠加），
 *            让不同来源的照片在暗色版式里读起来是一套系统而不是随机图库
 * - error  ：显式占位槽（网格纹理 + 说明），不是伪造的截图
 *
 * 注意这里为什么既要 onLoad 又要 useEffect 查 img.complete：
 * 命中浏览器缓存的图片可能在 React 挂上 onLoad 监听之前就已经加载完成，
 * 此时 onLoad 永远不会触发，图片会卡在 opacity-0 而「看不见」。
 * 挂载后主动查一次 complete 才能覆盖这条路径。
 */
export function SmartImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  eager?: boolean
}) {
  const [state, setState] = useState<LoadState>('loading')
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const node = imgRef.current
    if (!node) return

    // 已经载入完成（含缓存命中）的情况在这里补齐状态
    if (node.complete) {
      setState(node.naturalWidth > 0 ? 'ready' : 'error')
    }
  }, [src])

  return (
    <div
      className={`relative overflow-hidden bg-surface-2 ${className}`}
      data-state={state}
    >
      {state === 'loading' && (
        <Skeleton className="absolute inset-0" />
      )}

      {state === 'error' ? (
        <div
          role="img"
          aria-label={`${alt}（图片占位）`}
          className="absolute inset-0 grid place-items-center [background-image:linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:26px_26px]"
        >
          <span className="flex items-center gap-2 font-mono text-[0.6875rem] text-fg-dim">
            <ImageOff size={13} strokeWidth={1.5} aria-hidden="true" />
            图片占位
          </span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover grayscale-[0.55] transition-[opacity,filter,transform] duration-700 ease-out group-hover:scale-[1.03] group-hover:grayscale-0 ${
            state === 'ready' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}

      {/* 冷调叠加：把整组照片统一到同一个色温里 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,rgb(91_200_232/0.07),transparent_58%)]"
      />
    </div>
  )
}
