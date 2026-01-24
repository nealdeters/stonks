import iconDefault from '../../icon.png';
import iconDec from '../../icon-dec-512.png';
import iconNov from '../../icon-nov.png';
import iconSummer from '../../icon-summer-512.png';

export const getThemeForDate = (date) => {
  const month = date.getMonth();
  let color = 'indigo';
  let icon = '🏆';
  let logo = iconDefault;

  if (month === 11) { // December
      color = 'emerald';
      icon = '🎄';
      logo = iconDec;
  } else if (month === 10) { // November
      color = 'orange';
      icon = '🦃';
      logo = iconNov;
  } else if (month >= 5 && month <= 7) { // Summer (June, July, August)
      logo = iconSummer;
  }
  
  return { color, icon, logo };
};