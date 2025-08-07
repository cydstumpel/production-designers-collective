// ========================
// Canvas Background
// ========================

let src = 'color'  // Special flag for color mode
let color = '#000000'  // Change this hex color to any color you want
let loop = true;
let restore = true;
let restoreTime = 5;
let radius = window.innerWidth / 48;
let blur = 1;
let enabled = true;


const distanceBetween = (point1, point2) => {
	return Math.sqrt(
		Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
	);
};

const angleBetween = (point1, point2) => {
	return Math.atan2(point2.x - point1.x, point2.y - point1.y);
};

const easeOutQuart = (x) => {
	return 1 - Math.pow(1 - x, 4)
}

class Canvas {
	constructor(props) {
		this.canvas = props.el;
		this.container = props.container;
		this.frame = 0;
		this.enabled = props.enabled;
		this.videoLoop = props.videoLoop;

		this.asset = {
			src: props.assetSrc,
			color: props.color || color,
			file: null
		};

		this.restoreTime = props.restoreTime * 60 || 0;
		this.restore = props.restore;
		this.radius = props.radius || 70;
		this.blur = props.blur;

		this.mousePos = { x: 0, y: 0 };
		this.mousePosX = gsap.quickTo(this.mousePos, 'x', { duration: 0.4, ease: 'power4' });
		this.mousePosY = gsap.quickTo(this.mousePos, 'y', { duration: 0.4, ease: 'power4' });
		this.imageLoaded = false;
		this.firstDraw = true;

		gsap.timeline()
			.to('.page-header video', {
				opacity: 1,
				delay: 0.5,
				duration: 1,
				ease: 'power1'
			}, 0.5)
			.to('canvas', {
				opacity: 1,
				duration: 1,
				ease: 'power1'
			}, '<')
		this.init();
	}

	stop() {
		this.enabled = false;
	}

	start() {
		this.enabled = true;
	}

	async init() {
		this.brush = new Brush({
			restoreTime: this.restoreTime,
			container: this.container,
			restore: this.restore,
			radius: this.radius,
			blur: this.blur
		});

		this.ctx = this.canvas.getContext('2d');
		await this.loadAssets();

		this.maskCanvas = document.createElement('canvas');
		this.maskCtx = this.maskCanvas.getContext('2d');

		this.initEvents();

		this.imageLoaded = true;
		if (this.onReady) {
			this.onReady();
		}
	}

	async reset(src, props, cb) {
		this.asset = {
			src: src,
			file: null
		};
		this.mousePos = {};
		this.imageLoaded = false;
		this.brush.reset(props);
		await this.loadAssets();
		this.imageLoaded = true;
		this.stopped = false;
		if (cb) cb();
	}

	destroy() {
		this.destroyEvents();
	}

	initEvents() {
		this.onResizeBound = this.onResize.bind(this);
		window.addEventListener('resize', this.onResizeBound);
		this.onResize();

		this.onMouseMoveBound = this.onMouseMove.bind(this);
		this.onMouseEnterBound = this.onMouseEnter.bind(this);
		this.onMouseLeaveBound = this.onMouseLeave.bind(this);

		this.container.addEventListener('mousemove', this.onMouseMoveBound);
		this.container.addEventListener('mouseenter', this.onMouseEnterBound);
		this.container.addEventListener('mouseleave', this.onMouseLeaveBound);
	}

	destroyEvents() {
		window.removeEventListener('resize', this.onResizeBound);
		this.container.removeEventListener('mousemove', this.onMouseMoveBound);
		this.container.removeEventListener('mouseenter', this.onMouseEnterBound);
		this.container.removeEventListener('mouseleave', this.onMouseLeaveBound);
		window.removeEventListener('scroll', this.onScrollBound);
	}

	loadAssets() {
		return new Promise((resolve) => {
			this.asset.file = 'color'
			resolve()
		})
	}

	draw() {
		if (!this.imageLoaded) return;
		this.frame += 1;
		if (this.firstDraw) {
			this.firstDraw = false;
			window.scrollTo(0, 0);
		}
		if (this.restore) {
			this.brush.update();
		}
		this.drawMask();

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.ctx.save();
		this.drawImage(this.maskCanvas, this.canvas, this.ctx);
		this.ctx.restore();

	}

	drawMask() {
		this.maskCtx.save();
		this.drawImage(this.asset.file, this.maskCanvas, this.maskCtx);
		this.maskCtx.globalCompositeOperation = 'destination-out';
		this.maskCtx.drawImage(
			this.brush.canvas,
			0,
			0,
			this.maskCanvas.width,
			this.maskCanvas.height
		);

		this.maskCtx.restore();
	}

	drawImage(image, canvas, ctx) {
		// If image is null (for color mode), fill with color
		if (!image || image === 'color') {
			ctx.fillStyle = this.asset.color  // Using the global color variable
			ctx.fillRect(0, 0, canvas.width, canvas.height)
			return
		}

		// Otherwise handle image/video as before
		const canvasAspectRatio = canvas.width / canvas.height
		let imageWidth, imageHeight
		imageWidth = image.width
		imageHeight = image.height

		const imageAspectRatio = imageWidth / imageHeight
		let drawWidth, drawHeight, sourceX, sourceY, sourceWidth, sourceHeight

		if (imageAspectRatio > canvasAspectRatio) {
			drawHeight = canvas.height
			drawWidth = drawHeight * imageAspectRatio
			sourceX = (imageWidth - imageHeight * canvasAspectRatio) / 2
			sourceY = 0
			sourceWidth = imageHeight * canvasAspectRatio
			sourceHeight = imageHeight
		} else {
			drawWidth = canvas.width
			drawHeight = drawWidth / imageAspectRatio
			sourceX = 0
			sourceY = (imageHeight - imageWidth / canvasAspectRatio) / 2
			sourceWidth = imageWidth
			sourceHeight = imageWidth / canvasAspectRatio
		}

		ctx.drawImage(
			image,
			sourceX, sourceY, sourceWidth, sourceHeight,
			0, 0, canvas.width, canvas.height
		);
	}

	onMouseEnter(e) {
		// Reset the last point when mouse enters to start fresh
		if (this.brush) {
			this.brush.lastPoint = undefined;
		}
		this.onMouseMove(e); // Handle the initial position
	}

	onMouseLeave() {
		// Reset the last point when mouse leaves
		if (this.brush) {
			this.brush.lastPoint = undefined;
		}
	}

	onMouseMove(e) {
		let x = e.clientX || e.pageX;
		let y = e.clientY || e.pageY;

		// Get the canvas rect and calculate the scale
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		// Adjust coordinates for canvas position and scale
		x = (x - rect.left) * scaleX;
		y = (y - rect.top) * scaleY;

		this.mousePosX(x);
		this.mousePosY(y);

		if (this.enabled && this.mousePos.x) {
			this.brush.addTouch({ ...this.mousePos });
		}
	}

	onResize() {
		radius = window.innerWidth / 24;

		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;

		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvasAspectRatio = this.canvas.width / this.canvas.height;

		this.maskCanvas.width = this.width;
		this.maskCanvas.height = this.height;
		this.canvasRect = this.canvas.getBoundingClientRect();

		this.brush.resize(this.width, (this.height / this.width) * this.width);
	}
}

class Brush {
	constructor(props) {
		this.container = props.container;
		this.width = 256;
		this.height = 256;
		this.maxAge = props.restoreTime;
		this.restore = props.restore;
		this.radius = props.radius;
		this.blur = props.blur;
		this.lastPoint;
		this.currentPoint;
		this.oldContainerRect;

		this.trail = [];

		this.initTexture();
	}

	initTexture() {
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.canvas.height = this.width;
		this.ctx = this.canvas.getContext('2d');

		this.canvas.id = 'gradientTexture';
	}

	reset(props) {
		if (props) {
			this.blur = props.blur !== undefined ? props.blur : this.blur;
		}
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.trail = [];
		this.lastPoint = undefined;
		console.log('reset', props);
	}

	update() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (this.restore) {
			// age points
			this.trail.forEach((point, i) => {
				point.age += 1;
				// remove old
				if (point.age > this.maxAge) {
					this.trail.splice(i, 1);
				}
			});
			this.trail.forEach((point, i) => {
				let last = false;
				if (i > 0) {
					last = this.trail[i - 1];
				}
				this.drawTouch(point, last);
			});
		}
	}

	updateContainerRect() {
		this.containerRect = this.container.getBoundingClientRect();
		this.oldContainerRect = this.containerRect;
	}

	addTouch(point) {
		if (this.oldContainerRect != this.containerRect) {
			this.updateContainerRect();
		}

		// Use point coordinates directly without container offset
		let newPoint = {
			x: point.x,
			y: point.y,
			age: 0
		};

		if (this.restore) {
			this.trail.push(newPoint);
		} else {
			this.currentPoint = newPoint;
			// Draw only at the current point, no interpolation
			this.drawTouch(newPoint, null);
		}
	}

	resize(width, height) {
		this.width = width;
		this.height = height;
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.containerRect = this.container.getBoundingClientRect();
	}

	drawTouch(point, lastPoint) {
		let radius = this.radius;
		let blur = (1 - this.blur) * radius;
		let grd;

		// Add spread factor based on age
		const spreadFactor = point.age ? Math.min(1.5, 1 + (point.age / this.maxAge) * 0.5) : 1;
		const currentRadius = radius * spreadFactor;
		const currentBlur = blur * spreadFactor;

		const glowRadius = currentRadius;
		const glowBlur = glowRadius * 4;

		const drawGlow = (pt, intensity = 1) => {
			this.drawGlowAt(pt, glowBlur, glowRadius, intensity);
		};

		// Draw interpolated points if we have a last point and it's not a new stroke
		if (lastPoint && lastPoint !== null) {
			const dist = distanceBetween(lastPoint, point);

			// Calculate step size based on distance and speed
			// Keep minimum density even at high speeds
			const maxStep = 4; // Maximum step size to ensure minimum density
			const step = Math.min(maxStep, Math.max(2, Math.floor(dist / 40)));
			if (dist > 0) {
				const angle = angleBetween(lastPoint, point);
				const sin = Math.sin(angle);
				const cos = Math.cos(angle);

				// Pre-calculate common values
				const baseIntensity = 0.7;
				const intensityRange = 0.3;
				const variationRange = 2;

				for (let i = 0; i < dist; i += step) {
					const x = lastPoint.x + sin * i;
					const y = lastPoint.y + cos * i;

					// Faster random variation using a single random call
					const rand = Math.random();
					const pt = {
						x: x + (rand - 0.5) * variationRange,
						y: y + (Math.random() - 0.5) * variationRange
					};

					const intensity = baseIntensity + rand * intensityRange;
					drawGlow(pt, intensity);

					// Reuse gradient for consecutive points to improve performance
					if (i % (step * 2) === 0) {
						grd = this.createGradient(pt, currentBlur, currentRadius, point.age);
					}
					this.drawAt(pt, currentBlur, currentRadius, grd, point.age);
				}
			}
		}

		// Always draw the current point
		drawGlow(point);
		grd = this.createGradient(point, currentBlur, currentRadius, point.age);
		this.drawAt(point, currentBlur, currentRadius, grd, point.age);
	}

	// Draw a white inner glow at the eraser edge
	drawGlowAt(point, blur, radius, intensity = 1) {
		this.ctx.save();
		this.ctx.globalCompositeOperation = 'lighter';
		let glow = this.ctx.createRadialGradient(
			point.x,
			point.y,
			blur * 0.5, // Smaller inner radius for more concentrated glow
			point.x,
			point.y,
			radius
		);
		// Adjust glow opacity based on intensity
		const innerOpacity = 0.7 * intensity;
		const midOpacity = 0.3 * intensity;
		glow.addColorStop(0, `rgba(255,255,255,${innerOpacity})`);
		glow.addColorStop(0.5, `rgba(255,255,255,${midOpacity})`);
		glow.addColorStop(1, 'rgba(255,255,255,0)');
		this.ctx.beginPath();
		this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
		this.ctx.fillStyle = glow;
		this.ctx.fill();
		this.ctx.restore();
	}

	createGradient(point, blur, radius, age = 0) {
		// Calculate opacity based on age with a more organic fade
		const maxAge = this.maxAge;
		const progress = Math.min(1, age / maxAge);
		const opacity = 1 - easeOutQuart(progress);

		// Add slight randomness to the blur radius for more natural look
		const randomBlur = blur * (0.8 + Math.random() * 0.4);

		let grd = this.ctx.createRadialGradient(
			point.x,
			point.y,
			randomBlur,
			point.x,
			point.y,
			radius
		);

		// Create multiple color stops for a more watercolor-like effect
		grd.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.9})`);
		grd.addColorStop(0.3, `rgba(255, 255, 255, ${opacity * 0.7})`);
		grd.addColorStop(0.6, `rgba(255, 255, 255, ${opacity * 0.4})`);
		grd.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
		return grd;
	}

	drawAt(point, blur, radius, grd, age = 0) {
		this.ctx.beginPath()
		if (blur === radius) {
			// Calculate opacity based on age for solid fill with easeOutQuart
			const maxAge = this.maxAge
			const progress = Math.min(1, age / maxAge)
			const opacity = 1 - easeOutQuart(progress)
			this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
		} else {
			this.ctx.fillStyle = grd
		}
		this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
		this.ctx.fill()
	}
}

const initHeaderCanvas = () => {
	// Get canvas elements after DOM is loaded
	const canvasEl = document.getElementById('canvas');
	const canvasContainer = document.querySelector('.page-header');

	let canvas = new Canvas({
		el: canvasEl,
		container: canvasContainer,
		assetSrc: src,
		videoLoop: true,
		restore,
		restoreTime,
		radius,
		blur,
		enabled
	});
	let rafId;
	(function raf() {
		canvas.draw();
		rafId = requestAnimationFrame(raf);
	})();
	return () => {
		cancelAnimationFrame(rafId);
		canvas.destroy();
	};
};


const initBlockCanvas = () => {
	// Get canvas elements after DOM is loaded
	const canvasEls = document.querySelectorAll('.trail-clip__canvas');
	const canvasContainer = document.querySelector('.trail-clip');
	canvasEls.forEach(canvasEl => {
		let canvas = new Canvas({
			el: canvasEl,
			container: canvasContainer,
			assetSrc: src,
			videoLoop: true,
			color: '#fffbf5',
			restore,
			restoreTime,
			radius,
			blur,
			enabled
		});
		let rafId;
		(function raf() {
			canvas.draw();
			rafId = requestAnimationFrame(raf);
		})();
		return () => {
			cancelAnimationFrame(rafId);
			canvas.destroy();
		};
	})
};

// ========================
// Scroll Trigger Stagger Text
// ========================

const initStaggerText = () => {
	const staggerTexts = document.querySelectorAll('.st-stagger-text')
	if (!staggerTexts) return;
	staggerTexts.forEach(text => {
		const from = text.dataset.from || 'top';


		SplitText.create(text, {
			type: 'lines, chars',
			linesClass: 'line',
			autoSplit: true,
			onSplit: (self) => {
				gsap.from(self.chars, {
					scrollTrigger: {
						trigger: text,
						start: 'top 90%',
						end: 'bottom 50%',
					},
					y: from === 'top' ? '-250%' : '250%',
					opacity: 0,
					skewY: -5,
					duration: 1,
					stagger: {
						amount: 0.5,
					},
					ease: 'power4.out',
				})
			}
		});
	})
}

// ========================
// Scroll Trigger Hrs
// ========================

const initHrs = () => {
	const verticalHrs = document.querySelectorAll('hr.vertical')
	const horizontalHrs = document.querySelectorAll('hr.horizontal')
	if (!verticalHrs && !horizontalHrs) return;

	verticalHrs.forEach(hr => {
		gsap.to(hr, {
			scrollTrigger: {
				trigger: hr,
				start: 'top 90%',
				end: 'bottom 50%',
			},
			clipPath: 'inset(0 0 0% 0)',
			duration: 1,
			ease: 'power4.out',
		})
	})
	horizontalHrs.forEach(hr => {
		gsap.to(hr, {
			scrollTrigger: {
				trigger: hr,
				start: 'top 90%',
				end: 'bottom 50%',
			},
			clipPath: 'inset(0 0% 0 0)',
			duration: 1,
			ease: 'power4.out',
		})
	})
}

// ========================
// Big Numbers Stagger Text
// ========================

const initBigNumbers = () => {
	const bigNumbers = document.querySelectorAll('.two-column-text__number')
	if (!bigNumbers) return;
	const container = document.querySelector('.two-column-text')
	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: container,
			start: 'top 10%',
			end: 'bottom bottom',
			scrub: true,
		}
	})
	bigNumbers.forEach((number, index) => {
		const numberHeading = number.querySelector('h3')
		const numberText = number.querySelector('p')
		new SplitText(numberHeading, {
			type: 'chars, lines',
			linesClass: 'line',
			charsClass: 'char',
			autoSplit: true,
			onSplit: (self) => {
				tl.set(self.chars, {
					y: '100%',
				})
				tl.to(self.chars, {
					stagger: 0.05,
					y: '0%',
					ease: 'power4.out',
				}, index * 1)
				tl.to(numberText, {
					opacity: 1,
					ease: 'power4.out',
				}, index * 1)
				tl.to(self.chars, {
					stagger: 0.05,
					y: '-100%',
					ease: 'power4.out',
				}, index * 1 + 0.7)
				tl.to(numberText, {
					opacity: 0,
					ease: 'power4.out',
				}, index * 1 + 0.7)
			}
		})
	})
}

const initClip = () => {
	const clippedContainer = document.querySelector('.two-column-text')
	if (!clippedContainer) return;

	gsap.to(clippedContainer, {
		scrollTrigger: {
			trigger: clippedContainer,
			start: 'bottom 110%',
			end: 'bottom 10%',
			scrub: true,
		},
		clipPath: 'inset(0% 0 100% 0)',
		duration: 1,
		ease: 'power4.out',
	})
}



const initScrollMediaText = () => {
	const scrollMediaText = document.querySelector('.scroll-media-text')
	if (!scrollMediaText) return;
	const scrollMedias = scrollMediaText.querySelectorAll('.scroll-media-text__media')
	scrollMedias.forEach((media, index) => {
		if (index !== scrollMedias.length - 1) {
			const scrollMediaTrigger = document.querySelector(`.scroll-media-text__trigger:nth-child(${index + 1})`)
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: scrollMediaTrigger,
					start: 'top 80%',
					end: 'bottom bottom',
					scrub: true,
				}
			})
			tl.to(media, {
				clipPath: 'inset(0% 0 100% 0)',
				duration: 1,
				ease: 'power4.out',
			})
		}
	})
}




document.addEventListener('DOMContentLoaded', (event) => {
	initHeaderCanvas()
	initBlockCanvas()
	gsap.registerPlugin(SplitText, ScrollTrigger)
	// wait for akzidenz font to load
	initHrs()
	initBigNumbers()
	initClip()
	initScrollMediaText()
	document.fonts.ready.then(function () {
		initStaggerText()
	})
	// gsap code here!
});