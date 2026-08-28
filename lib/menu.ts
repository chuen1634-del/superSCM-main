export type MenuRole = 'USER' | 'ADMIN';

export type MenuItem = {
  href: string;
  label: string;
  description?: string;
  icon?: string;
};

export const userMenu: MenuItem[] = [
  { href: '/', label: '전체 현황', description: '월간 발주계획 현황', icon: 'dashboard' },
  { href: '/workflow', label: '수요 확정', description: '수요 데이터를 확인하고 확정', icon: 'demand' },
  { href: '/workflow', label: '재고·공급', description: '재고와 공급 현황 확인', icon: 'supply' },
  { href: '/workflow', label: '마스터 검증', description: '기준정보와 매핑 검증', icon: 'master' },
  { href: '/workflow', label: '발주량 계산', description: '월간 발주량 계산', icon: 'calculation' },
  { href: '/workflow', label: '보고자료', description: '발주계획 보고자료 확인', icon: 'report' },
  { href: '/analysis/leadtime', label: '리드타임 분석', description: '공급처별 리드타임 격차', icon: 'timeline' },
  { href: '/analysis/stockout', label: '소진위험 분석', description: '품목별 재고 소진 위험', icon: 'inventory' },
  { href: '/analysis/demand-profile', label: '수요 프로파일', description: 'SKU별 수요 패턴 분류', icon: 'demand' },
];

export const adminMenu: MenuItem[] = [
  { href: '/admin', label: '관리자 현황', description: '시스템 운영 현황', icon: 'settings' },
  { href: '/admin/users', label: '사용자 관리', description: '사용자 role과 활성 상태', icon: 'users' },
  { href: '/admin/forecast-settings', label: 'Forecast 설정', description: '학습·검증 기간과 정책', icon: 'forecast' },
  { href: '/admin/forecast-models', label: 'Forecast 모델', description: 'Baseline 모델과 파라미터', icon: 'forecast' },
  { href: '/admin/forecast-runs', label: 'Forecast 실행', description: '실행 이력과 stale 상태', icon: 'calculation' },
  { href: '/admin/data-management', label: '데이터 적재', description: '파일 업로드·검증·rollback', icon: 'upload' },
  { href: '/workflow', label: '기존 업무 화면', description: '레거시 workflow', icon: 'workflow' },
];

export function getMenuForRole(role: MenuRole): MenuItem[] {
  return role === 'ADMIN' ? [...userMenu, ...adminMenu] : userMenu;
}
