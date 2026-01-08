import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ParticleSystem } from './particles.js';
import { createPlanarCMOS, createSOICMOS, createFinFET, createGAAFET } from './models.js';

// State
let scene, camera, renderer, controls;
let currentModelGroup = null;
let animationId;
const particleSystem = new ParticleSystem();

let currentModelType = 'planar';
let currentLanguage = 'zh';

const I18N = {
    zh: {
        models: {
            planar: {
                titleHtml: 'Planar MOSFET<br><span class="model-subtitle">(平面场效应晶体管)</span>',
                desc: '传统的平面结构，电流在硅片表面的二维平面中流动。随着尺寸缩小，漏电流难以控制。'
            },
            soi: {
                titleHtml: 'SOI MOSFET<br><span class="model-subtitle">(绝缘体上硅场效应管)</span>',
                desc: '在硅衬底和活性层之间增加了一层氧化埋层(BOX)，减少寄生电容和漏电流，适合低功耗应用。'
            },
            finfet: {
                titleHtml: 'FinFET<br><span class="model-subtitle">(鳍式场效应晶体管)</span>',
                desc: '将通道竖立起来形成"鳍(Fin)"，栅极三面包裹通道，极大增强了对电流的控制能力，是22nm-5nm节点的主流技术。'
            },
            gaafet: {
                titleHtml: 'GAAFET<br><span class="model-subtitle">(全环绕栅极场效应管)</span>',
                desc: '栅极四面完全包裹通道（通常为纳米线或纳米片），提供极致的电流控制能力，是3nm及以下节点的关键技术。'
            }
        },
        buttons: {
            planar: '平面 MOSFET',
            soi: 'SOI MOSFET',
            finfet: 'FinFET',
            gaafet: 'GAAFET'
        }
    },
    en: {
        models: {
            planar: {
                titleHtml: 'Planar MOSFET<br><span class="model-subtitle">(Planar MOSFET)</span>',
                desc: 'A traditional planar structure where current flows along the silicon surface. As scaling continues, leakage becomes harder to control.'
            },
            soi: {
                titleHtml: 'SOI MOSFET<br><span class="model-subtitle">(Silicon-on-Insulator MOSFET)</span>',
                desc: 'Adds a buried oxide (BOX) layer between substrate and active silicon, reducing parasitics and leakage, suitable for low-power designs.'
            },
            finfet: {
                titleHtml: 'FinFET<br><span class="model-subtitle">(Fin Field-Effect Transistor)</span>',
                desc: 'Uses a vertical fin channel. The gate wraps around three sides of the fin, greatly improving electrostatic control. Mainstream from ~22nm to 5nm.'
            },
            gaafet: {
                titleHtml: 'GAAFET<br><span class="model-subtitle">(Gate-All-Around FET)</span>',
                desc: 'The gate fully surrounds the channel (nanowire/nanosheet), offering the best control and enabling sub-3nm technology nodes.'
            }
        },
        buttons: {
            planar: 'Planar MOSFET',
            soi: 'SOI MOSFET',
            finfet: 'FinFET',
            gaafet: 'GAAFET'
        }
    }
};

function updateModelButtonsActive(type) {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.model === type);
    });
}

function updateModelButtonsText(lang) {
    document.querySelectorAll('.btn').forEach(btn => {
        const model = btn.dataset.model;
        const text = I18N?.[lang]?.buttons?.[model];
        if (text) btn.innerText = text;
    });
}

function updateLanguageButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function applyLanguage(lang, { persist } = { persist: true }) {
    if (!I18N[lang]) return;
    currentLanguage = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    if (persist) localStorage.setItem('lang', lang);
    updateLanguageButtons(lang);
    updateModelButtonsText(lang);
    updateUI(currentModelType);
}

function setupLights() {
    RectAreaLightUniformsLib.init();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 40);
    spotLight.position.set(5, 10, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    const rectLight1 = new THREE.RectAreaLight(0x4488ff, 12, 10, 10);
    rectLight1.position.set(-5, 5, 5);
    rectLight1.lookAt(0, 0, 0);
    scene.add(rectLight1);

    const rectLight2 = new THREE.RectAreaLight(0xff8844, 12, 10, 10);
    rectLight2.position.set(5, 5, -5);
    rectLight2.lookAt(0, 0, 0);
    scene.add(rectLight2);

    const bottomLight = new THREE.DirectionalLight(0xaabbff, 3);
    bottomLight.position.set(0, -5, 0);
    bottomLight.target.position.set(0, 0, 0);
    scene.add(bottomLight);
    scene.add(bottomLight.target);
}

function clearScene() {
    if (currentModelGroup) {
        scene.remove(currentModelGroup);
        currentModelGroup.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
            }
        });
        currentModelGroup = null;
    }
    renderer.renderLists.dispose();
}

function updateUI(type) {
    const titleHtml = I18N?.[currentLanguage]?.models?.[type]?.titleHtml;
    const desc = I18N?.[currentLanguage]?.models?.[type]?.desc;
    if (titleHtml) document.getElementById('model-title').innerHTML = titleHtml;
    if (desc) document.getElementById('model-desc').innerText = desc;
}

window.setLanguage = function(lang) {
    applyLanguage(lang, { persist: true });
}

window.switchModel = function(type) {
    currentModelType = type;
    clearScene();

    updateModelButtonsActive(type);
    updateUI(type);

    if(type === 'planar') currentModelGroup = createPlanarCMOS(scene, particleSystem);
    if(type === 'soi') currentModelGroup = createSOICMOS(scene, particleSystem);
    if(type === 'finfet') currentModelGroup = createFinFET(scene, particleSystem);
    if(type === 'gaafet') currentModelGroup = createGAAFET(scene, particleSystem);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    
    if(currentModelGroup) {
        currentModelGroup.rotation.y += 0.002;
    }
    
    particleSystem.update();
    renderer.render(scene, camera);
}

function init() {
    const container = document.getElementById('canvas-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.02);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(7, 6, 12);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);

    // Lights
    setupLights();

    // Initial Model based on URL param
    const urlParams = new URLSearchParams(window.location.search);
    const modelIndex = urlParams.get('type');
    const langParam = urlParams.get('lang');
    const storedLang = localStorage.getItem('lang');
    const browserLang = (navigator.language || '').toLowerCase();
    const initialLang = (langParam === 'zh' || langParam === 'en')
        ? langParam
        : (storedLang === 'zh' || storedLang === 'en')
            ? storedLang
            : (browserLang.startsWith('zh') ? 'zh' : 'en');

    if (modelIndex === '2') {
        currentModelType = 'soi';
        currentModelGroup = createSOICMOS(scene, particleSystem);
    } else if (modelIndex === '3') {
        currentModelType = 'finfet';
        currentModelGroup = createFinFET(scene, particleSystem);
    } else if (modelIndex === '4') {
        currentModelType = 'gaafet';
        currentModelGroup = createGAAFET(scene, particleSystem);
    } else {
        currentModelType = 'planar';
        currentModelGroup = createPlanarCMOS(scene, particleSystem);
    }

    updateModelButtonsActive(currentModelType);
    applyLanguage(initialLang, { persist: langParam === 'zh' || langParam === 'en' });

    // Resize listener
    window.addEventListener('resize', onWindowResize);

    // Animation Loop
    animate();
}

// Start
init();

