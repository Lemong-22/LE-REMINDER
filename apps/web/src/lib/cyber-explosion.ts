// Zero-dependency Cyber/Game-Style Particle Explosion Engine
// Renders to a lightweight, temporary full-viewport canvas with hardware-accelerated RAF.
// Strictly themed to the LE-REMINDER Luminous Midnight Blue palette.

const MIDNIGHT_CYBER_PALETTE = [
	"#3B82F6", // Electric Blue accent
	"#60A5FA", // Bright Sky Blue
	"#06B6D4", // Luminous Cyan
	"#10B981", // Emerald spark
	"#F1F5F9", // Radiant Light Slate
];

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	color: string;
	alpha: number;
	rotation: number;
	rotationSpeed: number;
	shape: "square" | "shard" | "diamond" | "spark";
	drag: number;
	gravity: number;
	life: number;
	maxLife: number;
}

let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;
const particles: Particle[] = [];
let animFrameId: number | null = null;

function ensureCanvas(): {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
} | null {
	if (typeof window === "undefined") return null;

	if (!activeCanvas) {
		const canvas = document.createElement("canvas");
		canvas.style.position = "fixed";
		canvas.style.inset = "0";
		canvas.style.width = "100vw";
		canvas.style.height = "100vh";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "99999";
		document.body.appendChild(canvas);
		activeCanvas = canvas;
	}

	const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
	const width = window.innerWidth;
	const height = window.innerHeight;

	const targetW = Math.round(width * dpr);
	const targetH = Math.round(height * dpr);

	if (activeCanvas.width !== targetW || activeCanvas.height !== targetH) {
		activeCanvas.width = targetW;
		activeCanvas.height = targetH;
	}

	if (!activeCtx) {
		activeCtx = activeCanvas.getContext("2d");
	}

	return activeCtx ? { canvas: activeCanvas, ctx: activeCtx } : null;
}

function renderFrame() {
	if (!activeCtx || !activeCanvas) return;

	const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
	activeCtx.save();
	activeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	activeCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life++;
		p.x += p.vx;
		p.y += p.vy;
		p.vx *= p.drag;
		p.vy = p.vy * p.drag + p.gravity;
		p.rotation += p.rotationSpeed;
		p.alpha = Math.max(0, 1 - p.life / p.maxLife);

		if (p.alpha <= 0 || p.life >= p.maxLife) {
			particles.splice(i, 1);
			continue;
		}

		activeCtx.save();
		activeCtx.translate(p.x, p.y);
		activeCtx.rotate(p.rotation);
		activeCtx.globalAlpha = p.alpha;
		activeCtx.fillStyle = p.color;

		switch (p.shape) {
			case "diamond": {
				activeCtx.beginPath();
				activeCtx.moveTo(0, -p.size * 1.5);
				activeCtx.lineTo(p.size, 0);
				activeCtx.lineTo(0, p.size * 1.5);
				activeCtx.lineTo(-p.size, 0);
				activeCtx.closePath();
				activeCtx.fill();
				break;
			}
			case "shard": {
				activeCtx.beginPath();
				activeCtx.moveTo(-p.size * 0.4, -p.size * 1.8);
				activeCtx.lineTo(p.size * 0.6, -p.size * 0.4);
				activeCtx.lineTo(p.size * 0.2, p.size * 1.8);
				activeCtx.lineTo(-p.size * 0.8, p.size * 0.2);
				activeCtx.closePath();
				activeCtx.fill();
				break;
			}
			case "spark": {
				activeCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
				break;
			}
			default: {
				activeCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
				break;
			}
		}

		activeCtx.restore();
	}

	activeCtx.restore();

	if (particles.length > 0) {
		animFrameId = requestAnimationFrame(renderFrame);
	} else {
		if (animFrameId) {
			cancelAnimationFrame(animFrameId);
			animFrameId = null;
		}
		if (activeCanvas?.parentNode) {
			activeCanvas.parentNode.removeChild(activeCanvas);
			activeCanvas = null;
			activeCtx = null;
		}
	}
}

const MAX_PARTICLES = 64;

/**
 * Triggers a snappy, high-tech cyber explosion originating from the given
 * DOM element or mouse/pointer event.
 */
export function triggerCyberExplosion(
	target: HTMLElement | { clientX: number; clientY: number },
) {
	if (typeof window === "undefined") return;

	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (prefersReducedMotion) return;

	const surface = ensureCanvas();
	if (!surface) return;

	let originX = window.innerWidth / 2;
	let originY = window.innerHeight / 2;

	if ("getBoundingClientRect" in target) {
		const rect = target.getBoundingClientRect();
		originX = rect.left + rect.width / 2;
		originY = rect.top + rect.height / 2;
	} else if ("clientX" in target) {
		originX = target.clientX;
		originY = target.clientY;
	}

	// Evict oldest particles if approaching upper threshold during rapid clicks
	if (particles.length > MAX_PARTICLES - 28) {
		particles.splice(0, particles.length - (MAX_PARTICLES - 28));
	}

	// 1. Core High-Velocity Radial Shockwave Shards (fast, snappy cyber blast)
	const coreParticleCount = 18;
	for (let i = 0; i < coreParticleCount; i++) {
		const angle =
			(i / coreParticleCount) * (Math.PI * 2) + (Math.random() * 0.2 - 0.1);
		const speed = 7 + Math.random() * 8;
		const color =
			MIDNIGHT_CYBER_PALETTE[
				Math.floor(Math.random() * MIDNIGHT_CYBER_PALETTE.length)
			];
		const shapes: Particle["shape"][] = ["shard", "diamond", "square"];

		particles.push({
			x: originX,
			y: originY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: 2.2 + Math.random() * 3,
			color,
			alpha: 1,
			rotation: Math.random() * Math.PI * 2,
			rotationSpeed: (Math.random() - 0.5) * 0.35,
			shape: shapes[Math.floor(Math.random() * shapes.length)],
			drag: 0.91,
			gravity: 0.14,
			life: 0,
			maxLife: 30 + Math.floor(Math.random() * 15),
		});
	}

	// 2. Micro Spark Embers (faster, smaller spark discharge)
	const sparkCount = 12;
	for (let i = 0; i < sparkCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 4 + Math.random() * 7;
		const color = Math.random() > 0.4 ? "#3B82F6" : "#06B6D4";

		particles.push({
			x: originX,
			y: originY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: 1.5 + Math.random() * 1.5,
			color,
			alpha: 1,
			rotation: 0,
			rotationSpeed: 0,
			shape: "spark",
			drag: 0.93,
			gravity: 0.08,
			life: 0,
			maxLife: 22 + Math.floor(Math.random() * 15),
		});
	}

	if (!animFrameId) {
		animFrameId = requestAnimationFrame(renderFrame);
	}
}
