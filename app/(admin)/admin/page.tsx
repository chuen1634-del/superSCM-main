import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import InsightBanner from '@/components/ui/insight-banner';

export default function AdminPage() { return <><PageHeader eyebrow="ADMIN" title="관리자 현황" description="시스템 메뉴와 운영 상태를 관리합니다." /><Panel title="운영 안내"><InsightBanner title="관리자 메뉴">기준정보와 시스템 설정은 운영 권한이 있는 사용자만 변경할 수 있습니다.</InsightBanner></Panel></>; }
