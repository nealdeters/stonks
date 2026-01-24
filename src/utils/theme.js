export const getThemeForDate = (date) => {
  const month = date.getMonth();
  let color = 'indigo';
  let icon = '🏆';
  let logo = 'icon.png';

  if (month === 11) { // December
      color = 'emerald';
      icon = '🎄';
      logo = 'icon-dec-512.png';
  } else if (month === 10) { // November
      color = 'orange';
      icon = '🦃';
      logo = 'icon-nov.png';
  } else if (month >= 5 && month <= 7) { // Summer (June, July, August)
      logo = 'icon-summer-512.png';
  }
  
  return { color, icon, logo };
};