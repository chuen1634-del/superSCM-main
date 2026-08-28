import Link from 'next/link';
import Panel from '@/components/ui/panel';

export default function LoginPage() { return <div className="grid" style={{ maxWidth: 440, margin: '12vh auto 0' }}><Panel title="로그인"><p className="muted">SCM 시스템에 로그인하면 발주계획과 분석 화면을 확인할 수 있습니다.</p><Link className="button primary" href="/">시스템 들어가기</Link></Panel></div>; }
