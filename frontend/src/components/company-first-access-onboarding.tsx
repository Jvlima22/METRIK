import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAccount } from '@/lib/account-context';
import { useAuth } from '@/lib/auth-context';

const steps = [
  {
    key: 'primaryGoal',
    title: 'O que você quer alcançar primeiro com o Metrik?',
    subtitle: 'Vamos adaptar sua experiência com base na prioridade da sua empresa.',
    options: ['Gerar mais leads', 'Aumentar vendas', 'Reduzir custos', 'Melhorar o ROAS', 'Criar anúncios com IA', 'Acompanhar campanhas'],
  },
  {
    key: 'adChannels',
    title: 'Onde sua empresa anuncia hoje?',
    subtitle: 'Selecione os canais que você pretende analisar ou conectar.',
    options: ['Meta Ads', 'Google Ads', 'Meta Ads + Google Ads', 'Ainda não anuncio', 'Outro canal'],
  },
  {
    key: 'conversionEvent',
    title: 'Qual ação vale mais para o seu negócio?',
    subtitle: 'Usaremos essa informação para interpretar seus resultados corretamente.',
    options: ['Compra', 'Lead', 'Mensagem no WhatsApp', 'Ligação', 'Agendamento', 'Visita ao site', 'Outro'],
  },
  {
    key: 'managementModel',
    title: 'Quem cuida dos seus anúncios atualmente?',
    subtitle: 'Isso nos ajuda a ajustar o nível das recomendações e automações.',
    options: ['Eu mesmo', 'Equipe interna', 'Agência', 'Freelancer', 'Ainda não tenho campanhas'],
  },
] as const;

type StepKey = typeof steps[number]['key'];
type Answers = { primaryGoal: string; adChannels: string[]; conversionEvent: string; managementModel: string };

const emptyAnswers: Answers = { primaryGoal: '', adChannels: [], conversionEvent: '', managementModel: '' };

export function CompanyFirstAccessOnboarding() {
  const { isAdmin } = useAuth();
  const { activeCompanyId, setActiveCompanyId } = useAccount();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'complete' | 'error'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isAdmin) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    apiFetch<{ data: { eligible: boolean; profile: { company_id?: string; answers?: Answers; primary_goal?: string; ad_channels?: string[]; conversion_event?: string; management_model?: string } | null } }>('/company-onboarding/status')
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.eligible) { setStatus('idle'); return; }
        const profile = data.profile;
        if (profile?.company_id && profile.company_id !== activeCompanyId) setActiveCompanyId(profile.company_id);
        setAnswers({
          primaryGoal: profile?.primary_goal ?? profile?.answers?.primaryGoal ?? '',
          adChannels: profile?.ad_channels ?? profile?.answers?.adChannels ?? [],
          conversionEvent: profile?.conversion_event ?? profile?.answers?.conversionEvent ?? '',
          managementModel: profile?.management_model ?? profile?.answers?.managementModel ?? '',
        });
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [activeCompanyId, isAdmin, setActiveCompanyId]);

  useEffect(() => {
    if (status !== 'ready' && status !== 'complete') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const stars = Array.from({ length: 320 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), size: Math.random() * 1.5 + .35, phase: Math.random() * Math.PI * 2, speed: Math.random() * .02 + .012 }));
    let frame = 0;
    const resize = () => { canvas.width = window.innerWidth * devicePixelRatio; canvas.height = window.innerHeight * devicePixelRatio; };
    const render = (time: number) => {
      const width = canvas.width / devicePixelRatio; const height = canvas.height / devicePixelRatio;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) * .62;
      for (const star of stars) {
        star.z -= star.speed * .55;
        if (star.z < .015) { star.z = 1; star.x = Math.random() * 2 - 1; star.y = Math.random() * 2 - 1; }
        const perspective = 1 / star.z;
        const x = width / 2 + star.x * scale * perspective;
        const y = height / 2 + star.y * scale * perspective;
        if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;
        const pulse = .55 + Math.sin(time * .002 * (1 + star.speed * 20) + star.phase) * .24;
        const radius = Math.max(.35, star.size * (.35 + perspective * .22));
        context.beginPath(); context.fillStyle = `rgba(255,255,255,${Math.max(.12, Math.min(.92, pulse * (.3 + perspective * .1)))})`; context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
      }
      frame = requestAnimationFrame(render);
    };
    resize(); window.addEventListener('resize', resize); frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [status]);

  const currentStep = steps[stepIndex];
  const currentValue = useMemo(() => {
    if (currentStep.key === 'adChannels') return answers.adChannels[0] ?? '';
    return answers[currentStep.key as Exclude<StepKey, 'adChannels'>];
  }, [answers, currentStep.key]);

  if (isAdmin || (status !== 'ready' && status !== 'complete')) return null;

  function choose(option: string) {
    if (currentStep.key === 'adChannels') setAnswers((current) => ({ ...current, adChannels: [option] }));
    else setAnswers((current) => ({ ...current, [currentStep.key]: option }));
    if (stepIndex < steps.length - 1) setTimeout(() => setStepIndex((index) => index + 1), 180);
    else void complete(option);
  }

  async function complete(lastOption: string) {
    const nextAnswers = { ...answers, [currentStep.key]: lastOption } as Answers;
    try {
      setStatus('complete');
      await apiFetch('/company-onboarding/complete', { method: 'POST', body: JSON.stringify({ ...nextAnswers, answers: nextAnswers, formVersion: 'ads-onboarding-v1' }) });
      window.setTimeout(() => setStatus('idle'), 4300);
    } catch {
      setStatus('error');
    }
  }

  function goBack() { if (stepIndex > 0 && status === 'ready') setStepIndex((index) => index - 1); }

  return (
    <div className={`company-onboarding-overlay ${status === 'complete' ? 'company-onboarding-complete' : ''}`} role="dialog" aria-modal="true" aria-label="Configuração inicial da empresa">
      <canvas ref={canvasRef} className="company-onboarding-stars" aria-hidden="true" />
      <div className="company-onboarding-gradient" aria-hidden="true" />
      {status === 'complete' ? (
        <div className="company-onboarding-logo-sequence" aria-label="Metrik">
          <img className="company-onboarding-mark" src="/logo-ilustration-white.png" alt="" />
          <img className="company-onboarding-wordmark" src="/logo-METRIK-white.png" alt="" />
        </div>
      ) : (
        <div className="company-onboarding-card">
          <div className="company-onboarding-meta"><span>METRIK INTELLIGENCE</span><span>{String(stepIndex + 1).padStart(2, '0')} / 04</span></div>
          <h1>{currentStep.title}</h1>
          <p>{currentStep.subtitle}</p>
          <div className="company-onboarding-options">
            {currentStep.options.map((option) => <button key={option} type="button" className={currentValue === option ? 'selected' : ''} onClick={() => choose(option)}>{option}</button>)}
          </div>
          <div className="company-onboarding-footer"><button type="button" onClick={goBack} disabled={stepIndex === 0}>Voltar</button><div className="company-onboarding-dots">{steps.map((_, index) => <span key={index} className={index <= stepIndex ? 'active' : ''} />)}</div></div>
        </div>
      )}
    </div>
  );
}
