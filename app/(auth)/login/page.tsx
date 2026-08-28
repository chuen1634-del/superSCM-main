import Panel from '@/components/ui/panel';
import LoginForm from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const params = await searchParams; const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/'; return <div className="grid" style={{ maxWidth: 440, margin: '12vh auto 0' }}><Panel title="로그인"><p className="muted">SCM 시스템에 로그인하면 발주계획과 분석 화면을 확인할 수 있습니다.</p><LoginForm next={next} /></Panel></div>; }
