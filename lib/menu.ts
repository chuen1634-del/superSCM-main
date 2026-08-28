export type MenuRole = 'USER' | 'ADMIN';

export type MenuItem = {
  href: string;
  label: string;
  description?: string;
  icon?: string;
};

export const userMenu: MenuItem[] = [
  { href: '/', label: '전체 현황', description: '월간 발주계획 현황', icon: 'dashboard' },
  { href: '/analysis/leadtime', label: '리드타임 분석', description: '공급처별 리드타임 격차', icon: 'timeline' },
  { href: '/analysis/stockout', label: '소진위험 분석', description: '품목별 재고 소진 위험', icon: 'inventory' },
];

export const adminMenu: MenuItem[] = [
  { href: '/admin', label: '관리자 현황', description: '시스템 운영 현황', icon: 'settings' },
  { href: '/legacy/workflow', label: '기존 업무 화면', description: '레거시 workflow', icon: 'workflow' },
];

export function getMenuForRole(role: MenuRole): MenuItem[] {
  return role === 'ADMIN' ? [...userMenu, ...adminMenu] : userMenu;
}
