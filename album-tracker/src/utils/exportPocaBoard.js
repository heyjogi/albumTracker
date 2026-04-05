const SCALE = 1.5

export async function exportPocaBoardImage(albumVersions, cardCounts, filename = 'pocaboard') {
  if (!albumVersions?.length) return

  const html2canvas = (await import('html2canvas')).default

  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: -99999px;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0;
    background: #000000;
    padding: 0;
    font-family: 'Galmuri9', monospace;
    line-height: 1;
    box-sizing: border-box;
  `

  for (const version of albumVersions) {
    const tabEl = document.createElement('div')
    tabEl.style.cssText = `
      display: flex;
      flex-direction: column;
      background: #0a111a;
      padding: 12px 14px 14px;
      border-right: 1px solid rgba(0, 240, 255, 0.2);
      box-sizing: border-box;
      font-family: 'Galmuri9', monospace;
      line-height: 1;
    `

    const title = document.createElement('div')
    title.textContent = version.name
    title.style.cssText = `
      font-family: 'Galmuri9', monospace;
      font-size: 13px;
      line-height: 1.4;
      color: #00f0ff;
      letter-spacing: 2px;
      margin-bottom: 12px;
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      box-sizing: border-box;
    `
    tabEl.appendChild(title)

    for (const group of version.groups) {
      const groupEl = document.createElement('div')
      groupEl.style.cssText = `margin-bottom: 14px; box-sizing: border-box;`

      const groupTitle = document.createElement('div')
      groupTitle.textContent = group.name
      groupTitle.style.cssText = `
        font-family: 'Galmuri9', monospace;
        font-size: 9px;
        line-height: 1.6;
        color: #00aaaa;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(0, 240, 255, 0.15);
        letter-spacing: 1px;
        box-sizing: border-box;
      `
      groupEl.appendChild(groupTitle)

      const grid = document.createElement('div')
      grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(5, 66px);
        gap: 8px;
        box-sizing: border-box;
      `

      for (const card of group.cards) {
        const count = cardCounts[card.id] || 0
        const isOwned = count > 0
        const isDup = count >= 2
        const hasBorder = count === 0 || isDup
        const borderColor = isDup ? '#00ff00' : '#ff6600'

        const cardWrapper = document.createElement('div')
        cardWrapper.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          width: 66px;
          box-sizing: border-box;
        `

        const borderWrapper = document.createElement('div')
        borderWrapper.style.cssText = `
          position: relative;
          width: 66px;
          height: 102px;
          padding: ${hasBorder ? '2px' : '0px'};
          background: ${hasBorder ? borderColor : 'transparent'};
          box-sizing: border-box;
          flex-shrink: 0;
        `

        const cardInner = document.createElement('div')
        cardInner.style.cssText = `
          width: 100%;
          height: 100%;
          background: #050a0f;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
        `

        if (card.image) {
          const img = document.createElement('img')
          img.src = card.image
          img.crossOrigin = 'anonymous'
          img.style.cssText = `width: 100%; height: 100%; object-fit: cover; display: block;`
          cardInner.appendChild(img)
        }

        if (!isOwned) {
          const overlay = document.createElement('div')
          overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
          `
          cardInner.appendChild(overlay)
        }

        borderWrapper.appendChild(cardInner)

        // 뱃지 — borderWrapper 안에 absolute로 배치
        if (isDup) {
          const badge = document.createElement('div')
          badge.textContent = String(count - 1)
          badge.style.cssText = `
            position: absolute;
            top: -4px;
            right: -4px;
            width: 16px;
            height: 16px;
            background: #00ff00;
            color: #000000;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            box-sizing: border-box;
            z-index: 10;
          `
          borderWrapper.appendChild(badge)
        }

        cardWrapper.appendChild(borderWrapper)

        const nameWrap = document.createElement('div')
        nameWrap.style.cssText = `
          width: 66px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          box-sizing: border-box;
          margin-top: 3px;
        `
        const name = document.createElement('span')
        name.textContent = card.name
        name.style.cssText = `
          font-family: 'Galmuri9', monospace;
          font-size: 8px;
          line-height: 18px;
          color: ${isOwned ? '#00f0ff' : '#006666'};
          text-align: center;
          max-width: 66px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.5px;
          display: inline-block;
          vertical-align: middle;
        `
        nameWrap.appendChild(name)
        cardWrapper.appendChild(nameWrap)
        grid.appendChild(cardWrapper)
      }

      groupEl.appendChild(grid)
      tabEl.appendChild(groupEl)
    }

    container.appendChild(tabEl)
  }

  document.body.appendChild(container)

  const imgs = container.querySelectorAll('img')
  await Promise.allSettled(
    Array.from(imgs).map(img =>
      img.complete ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res })
    )
  )
  await document.fonts.ready

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#000000',
      scale: SCALE,
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
    })

    await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('toBlob failed')); return }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.png`
        a.click()
        URL.revokeObjectURL(url)
        resolve()
      }, 'image/png')
    })

  } finally {
    document.body.removeChild(container)
  }
}
