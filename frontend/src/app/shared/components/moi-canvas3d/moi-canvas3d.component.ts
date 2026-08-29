import {
  Component, ElementRef, Input, OnDestroy, AfterViewInit,
  ViewChild, PLATFORM_ID, inject, ChangeDetectionStrategy, NgZone, ChangeDetectorRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EventReport, EventTypeConfig } from '../../../core/models/event.model';

const COINS = 60;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

@Component({
  selector: 'app-moi-canvas3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './moi-canvas3d.component.html',
  styleUrl: './moi-canvas3d.component.scss',
})
export class MoiCanvas3DComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sectionEl') sectionEl!: ElementRef<HTMLDivElement>;
  @ViewChild('phase0El') phase0El!: ElementRef<HTMLDivElement>;
  @ViewChild('phase1El') phase1El!: ElementRef<HTMLDivElement>;
  @ViewChild('phase2El') phase2El!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) report!: EventReport;
  @Input({ required: true }) config!: EventTypeConfig;

  private readonly platform = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  webglFailed = false;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private coinGeo?: THREE.CylinderGeometry;
  private coins: THREE.Mesh[] = [];
  private frameId: number | null = null;
  private st: ScrollTrigger | null = null;

  private p1: THREE.Vector3[] = [];
  private p2: THREE.Vector3[] = [];
  private p3: THREE.Vector3[] = [];

  get totalGuests() { return this.report?.moi_count ?? 0; }
  get totalAmt() { return this.fmt(this.report?.total_amount ?? 0); }
  get groomAmt() { return this.fmt(this.report?.groom_amount ?? 0); }
  get brideAmt() { return this.fmt(this.report?.bride_amount ?? 0); }
  get cashAmt() { return this.fmt(this.report?.cash_amount ?? 0); }
  get chequeAmt() { return this.fmt(this.report?.cheque_amount ?? 0); }
  get onlineAmt() { return this.fmt(this.report?.online_amount ?? 0); }
  get groomCount() { return this.report?.groom_count ?? 0; }
  get brideCount() { return this.report?.bride_count ?? 0; }
  get groomPct() { return this.pct(this.report?.groom_amount, this.report?.total_amount); }
  get bridePct() { return this.pct(this.report?.bride_amount, this.report?.total_amount); }
  get cashPct() { return this.pct(this.report?.cash_amount, this.report?.total_amount); }
  get chequePct() { return this.pct(this.report?.cheque_amount, this.report?.total_amount); }
  get onlinePct() { return this.pct(this.report?.online_amount, this.report?.total_amount); }

  private fmt(n: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  }

  private pct(part = 0, total = 1): string {
    return total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platform)) return;
    this.ngZone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);
      this.initScene();
      if (this.webglFailed) return;
      this.buildCoins();
      this.setupScroll();
      this.startRender();
    });
  }

  ngOnDestroy() {
    this.st?.kill();
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.coins.forEach(coin => (coin.material as THREE.MeshStandardMaterial).dispose());
    this.coinGeo?.dispose();
    this.renderer?.dispose();
    if (isPlatformBrowser(this.platform)) {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera) return;
    const { offsetWidth: w, offsetHeight: h } = this.canvasEl.nativeElement;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private initScene() {
    const canvas = this.canvasEl.nativeElement;

    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) {
      this.webglFailed = true;
      this.ngZone.run(() => this.cdr.markForCheck());
      return;
    }

    const w = canvas.offsetWidth || 800;
    const h = canvas.offsetHeight || 480;

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      this.webglFailed = true;
      this.ngZone.run(() => this.cdr.markForCheck());
      return;
    }
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.scene!.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dir = new THREE.DirectionalLight(0xfff0d0, 2.5);
    dir.position.set(5, 8, 6);
    this.scene!.add(dir);

    const pt = new THREE.PointLight(0xffaa33, 3, 18);
    pt.position.set(-4, 3, 4);
    this.scene!.add(pt);

    window.addEventListener('resize', this.handleResize);
  }

  private buildCoins() {
    const r = this.report;
    if (!r || r.moi_count === 0) return;

    const totalGuests = Math.max(r.moi_count, 1);
    const totalAmt = Math.max(r.total_amount, 1);

    const groomN = Math.round(COINS * (r.groom_count / totalGuests));
    const brideN = COINS - groomN;

    const cashN = Math.round(COINS * (r.cash_amount / totalAmt));
    const chequeN = Math.round(COINS * (r.cheque_amount / totalAmt));
    const onlineN = Math.max(COINS - cashN - chequeN, 0);

    this.coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20);
    const goldBase = new THREE.Color(0xFFD700);

    for (let i = 0; i < COINS; i++) {
      const isGroom = i < groomN;
      const accent = isGroom ? new THREE.Color(0x4488FF) : new THREE.Color(0xFF88AA);
      const color = goldBase.clone().lerp(accent, 0.18);

      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.88,
        roughness: 0.12,
        emissive: color.clone().multiplyScalar(0.08),
      });

      const coin = new THREE.Mesh(this.coinGeo!, mat);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rad = 2 + Math.random() * 1.8;
      this.p1.push(new THREE.Vector3(
        rad * Math.sin(phi) * Math.cos(theta),
        rad * Math.sin(phi) * Math.sin(theta),
        rad * Math.cos(phi),
      ));

      const sideIdx = isGroom ? i : i - groomN;
      const sideTotal = isGroom ? groomN : brideN;
      const ang = ((sideIdx / Math.max(sideTotal - 1, 1)) * Math.PI * 1.4) - Math.PI * 0.7;
      const arcR = 2.2;
      this.p2.push(new THREE.Vector3(
        (isGroom ? -1 : 1) * (arcR * Math.cos(ang) * 0.7 + 1.5),
        arcR * Math.sin(ang) * 0.9,
        (Math.random() - 0.5) * 0.3,
      ));

      let cx: number, ci: number, cTotal: number;
      if (i < cashN) {
        cx = -2.8; ci = i; cTotal = Math.max(cashN, 1);
      } else if (i < cashN + chequeN) {
        cx = 0; ci = i - cashN; cTotal = Math.max(chequeN, 1);
      } else {
        cx = 2.8; ci = i - cashN - chequeN; cTotal = Math.max(onlineN, 1);
      }
      this.p3.push(new THREE.Vector3(
        cx + (Math.random() - 0.5) * 0.35,
        -1.8 + (ci / Math.max(cTotal - 1, 1)) * 3.6,
        (Math.random() - 0.5) * 0.35,
      ));

      coin.position.copy(this.p1[i]);
      coin.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
      coin.userData = {
        rotSpeed: (Math.random() - 0.5) * 0.025,
        floatPhase: Math.random() * Math.PI * 2,
      };

      this.coins.push(coin);
      this.scene!.add(coin);
    }
  }

  private setPhaseUI(phase: 0 | 1 | 2) {
    [this.phase0El, this.phase1El, this.phase2El].forEach((el, idx) => {
      const dom = el?.nativeElement;
      if (!dom) return;
      dom.style.opacity = idx === phase ? '1' : '0';
      dom.style.transform = idx === phase ? 'translateY(0)' : 'translateY(12px)';
      dom.style.pointerEvents = idx === phase ? 'auto' : 'none';
    });
  }

  private updateCoins(progress: number) {
    const P1_END = 0.33;
    const P2_END = 0.67;

    this.coins.forEach((coin, i) => {
      let target: THREE.Vector3;
      if (progress < P1_END) {
        target = this.p1[i];
      } else if (progress < P2_END) {
        const t = easeInOut((progress - P1_END) / (P2_END - P1_END));
        target = new THREE.Vector3().lerpVectors(this.p1[i], this.p2[i], t);
      } else {
        const t = easeInOut((progress - P2_END) / (1 - P2_END));
        target = new THREE.Vector3().lerpVectors(this.p2[i], this.p3[i], t);
      }
      coin.position.lerp(target, 0.12);
    });

    if (progress < P1_END - 0.05) this.setPhaseUI(0);
    else if (progress < P2_END - 0.05) this.setPhaseUI(1);
    else this.setPhaseUI(2);
  }

  private setupScroll() {
    const section = this.sectionEl.nativeElement;

    this.st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=160%',
      scrub: 1.2,
      pin: true,
      onUpdate: (self) => this.updateCoins(self.progress),
    });

    this.setPhaseUI(0);
  }

  private startRender() {
    const loop = (t: number) => {
      this.frameId = requestAnimationFrame(loop);
      this.coins.forEach((coin) => {
        coin.rotation.y += coin.userData['rotSpeed'] as number;
        coin.position.y += Math.sin(t * 0.0008 + (coin.userData['floatPhase'] as number)) * 0.0008;
      });
      this.renderer!.render(this.scene!, this.camera!);
    };
    this.frameId = requestAnimationFrame(loop);
  }
}
