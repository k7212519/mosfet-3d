import * as THREE from 'three';

// Particle System for Electron Flow
export class ParticleSystem {
    constructor() {
        this.mesh = null;
        this.count = 200; // Reduced from 400
        this.dummy = new THREE.Object3D();
        this.data = []; // { velocity, boundary }
    }

    init(type, scene, currentModelGroup) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
            this.data = [];
        }

        const geometry = new THREE.SphereGeometry(0.03, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Initialize based on type
        for (let i = 0; i < this.count; i++) {
            this.resetParticle(i, type, true);
        }
        
        if (currentModelGroup) {
            currentModelGroup.add(this.mesh); // Attach to rotating model
        } else {
            scene.add(this.mesh);
        }
    }

    resetParticle(i, type, randomX = false) {
        const dummy = this.dummy;
        
        // Common X range
        let xStart = -2.3; 
        let xEnd = 2.3;
        let x; // Will be set later based on xStart/xEnd logic if type specific
        
        let y, z;
        let speed = 0.01 + Math.random() * 0.01; // Slower speed

        // Specific Geometry Logic
        if (type === 'planar' || type === 'soi') {
            // Planar/SOI: Flow only between Source and Drain through Channel
            // Source starts at -1.75, Drain ends at 1.75
            // Restrict flow start/end to slightly inside these bounds
            xStart = -1.75; 
            xEnd = 1.75;
            
            x = randomX ? (Math.random() * (xEnd - xStart) + xStart) : xStart;

            // Z range: margin inside width 3.0 (so -1.4 to 1.4 safe)
            z = (Math.random() - 0.5) * 2.6; 
            
            // Flow on surface of active area (y=0)
            if (type === 'planar') y = 0.05; 
            if (type === 'soi') y = 0.05; 
            
        } else if (type === 'finfet') {
            x = randomX ? (Math.random() * (xEnd - xStart) + xStart) : xStart;
            // FinFET: Flow on Top and Sides of Fins
            // FinFET: Flow on Top and Sides of Fins
            const finChoice = Math.random() > 0.5 ? 0.6 : -0.6; // Choose Fin 1 or 2
            const faceChoice = Math.random(); // Top or Sides?
            
            if (faceChoice > 0.6) { // Top (40% chance)
                y = 0.56; // Just above fin
                z = finChoice + (Math.random() - 0.5) * 0.25;
            } else { // Sides (60% chance)
                y = 0.15 + (Math.random() - 0.5) * 0.7; 
                const sideOffset = 0.16; // Just outside width 0.3/2 = 0.15
                z = finChoice + (Math.random() > 0.5 ? sideOffset : -sideOffset);
            }

        } else if (type === 'gaafet') {
            // GAAFET: Flow on SURFACE of the nanosheets for better visibility
            const sheetIdx = Math.floor(Math.random() * 3);
            const sheetY = -1.0 + (sheetIdx * 0.6) + 0.002;
            
            // Distribute on the outer skin of the nanosheet
            const face = Math.random();
            const hH = 0.075; // Half Height
            const hW = 0.5;   // Half Width
            const eps = 0.02; // Offset
            
            if (face < 0.33) { // Top Surface
                y = sheetY + hH + eps;
                z = (Math.random() - 0.5) * (hW * 2);
            } else if (face < 0.66) { // Bottom Surface
                y = sheetY - hH - eps;
                z = (Math.random() - 0.5) * (hW * 2);
            } else if (face < 0.83) { // Front Side
                y = sheetY + (Math.random() - 0.5) * (hH * 2);
                z = hW + eps;
            } else { // Back Side
                y = sheetY + (Math.random() - 0.5) * (hH * 2);
                z = -hW - eps;
            }
            
            // Constrain X for GAAFET (S/D are at +/- 1.8)
            xStart = -2.2;
            xEnd = 2.2;
            if (!randomX) x = xStart;
        }

        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        
        // Store state
        this.data[i] = {
            velocity: speed,
            boundary: xEnd,
            start: xStart,
            type: type,
            y: y,
            z: z
        };
        
        this.mesh.setMatrixAt(i, dummy.matrix);
    }

    update() {
        if (!this.mesh) return;
        
        const dummy = this.dummy;
        
        for (let i = 0; i < this.count; i++) {
            const d = this.data[i];
            // Retrieve current position
            this.mesh.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            
            // Move
            dummy.position.x += d.velocity;
            
            // Reset if out of bounds
            if (dummy.position.x > d.boundary) {
                this.resetParticle(i, d.type, false); // Reset to start
            } else {
                // Update matrix
                dummy.updateMatrix();
                this.mesh.setMatrixAt(i, dummy.matrix);
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
}

