import { describe, it, expect } from 'vitest';
import { getThemeForDate } from '../utils/theme';

describe('getThemeForDate', () => {
  it('should return default theme for January', () => {
    const date = new Date('2024-01-15T12:00:00');
    expect(getThemeForDate(date)).toEqual({
      color: 'indigo',
      icon: '🏆',
      logo: 'icon.png'
    });
  });

  it('should return December theme', () => {
    const date = new Date('2024-12-25T12:00:00');
    expect(getThemeForDate(date)).toEqual({
      color: 'emerald',
      icon: '🎄',
      logo: 'icon-dec-512.png'
    });
  });

  it('should return November theme', () => {
    const date = new Date('2024-11-15T12:00:00');
    expect(getThemeForDate(date)).toEqual({
      color: 'orange',
      icon: '🦃',
      logo: 'icon-nov.png'
    });
  });

  it('should return Summer theme for June, July, August', () => {
    const summerMonths = [5, 6, 7]; // June, July, August
    summerMonths.forEach(month => {
      const date = new Date(2024, month, 15);
      expect(getThemeForDate(date)).toEqual({
        color: 'indigo',
        icon: '🏆',
        logo: 'icon-summer-512.png'
      });
    });
  });
});