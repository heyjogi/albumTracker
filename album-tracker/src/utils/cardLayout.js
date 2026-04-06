export const CARD_LAYOUTS = {
  VERTICAL: 'vertical',   // 55:85
  HORIZONTAL: 'horizontal', // 85:55
  SQUARE: 'square',     // 1:1
  PHOTO: 'photo',         // 4:6
  SEAL: 'seal',         // 4:5
};

const LAYOUT_CONFIG = {
  'PHOTOBOOK': {
    '포카 B': CARD_LAYOUTS.HORIZONTAL,
    '엽서': {
      '단체A': CARD_LAYOUTS.HORIZONTAL
    },
    '4컷사진': CARD_LAYOUTS.PHOTO,
    '아스테룸 패치': CARD_LAYOUTS.SQUARE
  },
  'INVENTORY': {
    '핀뱃지': CARD_LAYOUTS.SQUARE
  },
  'ID PASS': {
    '띠부씰 A': CARD_LAYOUTS.SEAL,
    '띠부씰 B': CARD_LAYOUTS.SEAL
  }
};

/**
 * albumType, groupName, cardName에 따른 카드 레이아웃 반환
 */
export const getCardLayout = (albumType, groupName, cardName) => {
  const groupConfig = LAYOUT_CONFIG[albumType]?.[groupName];
  if (!groupConfig) return CARD_LAYOUTS.VERTICAL;
  if (typeof groupConfig === 'string') return groupConfig;
  return groupConfig[cardName] || CARD_LAYOUTS.VERTICAL;
};
