import * as THREE from 'three';

// Materials - High Quality PBR
// 统一材质属性，仅颜色区分
const baseSiliconProps = {
    metalness: 0.6,
    roughness: 0.1, // More glossy
    clearcoat: 0.5, // Enhanced gloss
    clearcoatRoughness: 0.1
};

export const materials = {
    silicon: new THREE.MeshPhysicalMaterial({
        color: 0x333344,
        ...baseSiliconProps
    }),
    siliconActive: new THREE.MeshPhysicalMaterial({ // Doped regions (Source/Drain)
        color: 0xaa4444, 
        ...baseSiliconProps
    }),
    substrate: new THREE.MeshPhysicalMaterial({ // Substrate using same material quality as silicon
        color: 0x555555, // Brightened from 0x222222
        ...baseSiliconProps
    }),
    oxide: new THREE.MeshPhysicalMaterial({ // SiO2 / High-k
        color: 0xaaccff,
        transparent: true,
        opacity: 0.4,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.6,
        thickness: 0.5
    }),
    gateMetal: new THREE.MeshPhysicalMaterial({ // Poly-Si or Metal Gate
        color: 0xffd700, // Goldish look
        metalness: 0.9,
        roughness: 0.15,
        clearcoat: 0.3
    }),
    spacer: new THREE.MeshPhysicalMaterial({
        color: 0x888888,
        metalness: 0.1,
        roughness: 0.5
    })
};

