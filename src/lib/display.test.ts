import {describe, expect, it} from 'vitest';
import {courseDisplayTitle} from './display';

describe('catalog display labels', () => {
  it('localizes the reserved bucket without changing its stored name or slug', () => {
    const course = {slug: 'general-resources', title: 'General Resources'};
    expect(courseDisplayTitle(course)).toBe('方向通用资料');
    expect(course).toEqual({slug: 'general-resources', title: 'General Resources'});
  });
  it('keeps actual course names, including an English title', () => {
    expect(courseDisplayTitle({slug: 'reading', title: 'General Resources'})).toBe('General Resources');
    expect(courseDisplayTitle({title: '计算机网络'})).toBe('计算机网络');
  });
});
