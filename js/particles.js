import * as THREE from 'three';

// Particle System for Electron Flow
export class ParticleSystem {
    constructor() {
        this.mesh = null;
        this.count = 100; // Default count
        this.dummy = new THREE.Object3D();
        this.data = []; // { velocity, boundary }
        this.anchors = {}; // { [type]: { start, end, channelBox } }
    }

    init(type, scene, currentModelGroup) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
            this.data = [];
        }

        // Adjust particle count based on complexity
        // GAAFET has 9 channels, so it needs more particles, but 300 was too heavy.
        this.count = (type === 'gaafet') ? 150 : 100;

        const geometry = new THREE.SphereGeometry(0.025, 8, 8); // Increased size for visibility
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.9, // Higher opacity
            blending: THREE.AdditiveBlending
        });
        material.depthWrite = false;
        
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.renderOrder = 999;

        this.anchors[type] = null;
        if (currentModelGroup && (type === 'planar' || type === 'soi')) {
            const source = currentModelGroup.getObjectByName('source');
            const drain = currentModelGroup.getObjectByName('drain');
            const channel = currentModelGroup.getObjectByName('channel');

            if (source && drain && channel) {
                const sourceBox = new THREE.Box3().setFromObject(source);
                const drainBox = new THREE.Box3().setFromObject(drain);
                const channelBox = new THREE.Box3().setFromObject(channel);

                const sourceCenterWorld = new THREE.Vector3(
                    (sourceBox.min.x + sourceBox.max.x) / 2,
                    (sourceBox.min.y + sourceBox.max.y) / 2,
                    (sourceBox.min.z + sourceBox.max.z) / 2
                );
                const drainCenterWorld = new THREE.Vector3(
                    (drainBox.min.x + drainBox.max.x) / 2,
                    (drainBox.min.y + drainBox.max.y) / 2,
                    (drainBox.min.z + drainBox.max.z) / 2
                );

                const channelMinLocal = currentModelGroup.worldToLocal(channelBox.min.clone());
                const channelMaxLocal = currentModelGroup.worldToLocal(channelBox.max.clone());
                const channelBoxLocal = new THREE.Box3().setFromPoints([channelMinLocal, channelMaxLocal]);

                this.anchors[type] = {
                    start: currentModelGroup.worldToLocal(sourceCenterWorld),
                    end: currentModelGroup.worldToLocal(drainCenterWorld),
                    channelBox: channelBoxLocal
                };
            }
        }
        
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
            const a = this.anchors[type];
            if (a) {
                xStart = a.start.x;
                xEnd = a.end.x;
                x = randomX ? (Math.random() * (xEnd - xStart) + xStart) : xStart;

                const ch = a.channelBox;
                const zMargin = Math.max(0.0, (ch.max.z - ch.min.z) * 0.05);
                z = Math.random() * (ch.max.z - ch.min.z - zMargin * 2) + ch.min.z + zMargin;

                const layerThickness = Math.min(0.01, (ch.max.y - ch.min.y) * 0.2);
                const planarYOffset = (type === 'planar' || type === 'soi') ? -0.04 : 0;
                y = ch.max.y - 0.005 + planarYOffset + (Math.random() - 0.5) * layerThickness;
            } else {
                xStart = -1.75; 
                xEnd = 1.75;
                x = randomX ? (Math.random() * (xEnd - xStart) + xStart) : xStart;
                z = (Math.random() - 0.5) * 2.6; 
                if (type === 'planar') y = 0.05; 
                if (type === 'soi') y = 0.05; 
            }
            
        } else if (type === 'finfet') {
            x = randomX ? (Math.random() * (xEnd - xStart) + xStart) : xStart;
            // FinFET: Flow on Top and Sides of Fins
            const fins = [-0.6, 0, 0.6];
            const finChoice = fins[Math.floor(Math.random() * fins.length)]; // Choose Fin 1, 2, or 3
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
            // GAAFET: Flow through the 3x3 grid of nanosheets
            const zList = [-0.6, 0, 0.6];
            const yList = [0.3, 0.6, 0.9];
            
            const zCenter = zList[Math.floor(Math.random() * zList.length)];
            const yCenter = yList[Math.floor(Math.random() * yList.length)];
            
            // Strictly inside the nanosheets (Width 0.3, Height 0.14)
            y = yCenter + (Math.random() - 0.5) * 0.1;  // Inside height
            z = zCenter + (Math.random() - 0.5) * 0.25; // Inside width

            // Constrain X for GAAFET
            xStart = -2.3;
            xEnd = 2.3;
            if (!randomX) {
                x = xStart;
            } else {
                x = Math.random() * (xEnd - xStart) + xStart;
            }
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

