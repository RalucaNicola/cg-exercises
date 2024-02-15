import SceneView from '@arcgis/core/views/SceneView';
import { watch } from "@arcgis/core/core/reactiveUtils";
import * as webgl from "@arcgis/core/views/3d/webgl";
import { SpatialReference } from "@arcgis/core/geometry";
import { mat4 } from 'gl-matrix';
import WebScene from '@arcgis/core/WebScene';
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import RenderNode from "@arcgis/core/views/3d/webgl/RenderNode";
import ManagedFBO from "@arcgis/core/views/3d/webgl/ManagedFBO";
import * as THREE from "three";
import Mesh from '@arcgis/core/geometry/Mesh';
import Point from '@arcgis/core/geometry/Point';
import Graphic from '@arcgis/core/Graphic';
import { FillSymbol3DLayer, MeshSymbol3D } from '@arcgis/core/symbols';

const view = new SceneView({
    container: "viewDiv",
    map: new WebScene({
        portalItem: {
            id: "9beec9328ca24cd0ae38b3657471d329"
        }
    }),

    viewingMode: "local",

    qualityProfile: "high",

    environment: {
        atmosphere: {
            quality: "high"
        },

        lighting: {
            directShadowsEnabled: true
        }
    },
});

@subclass("esri.views.3d.AddGeometryRenderPass")
class AddGeometryRenderPass extends RenderNode {
    consumes: __esri.ConsumedNodes = { required: ["opaque-color"] };
    produces: __esri.RenderNodeOutput = "opaque-color";

    // local origin x,y,z -> the cube will draw relative to this
    localOrigin: Float32Array = new Float32Array([950763.6511, 6002193.8497, 450]);
    localOriginSR: __esri.SpatialReference = SpatialReference.WebMercator;
    localOriginRender: any = null;
    threeRenderer: THREE.WebGLRenderer;
    threeScene: THREE.Scene;
    threeCamera: THREE.PerspectiveCamera;
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;

    initialize(): void {
        // this.addHandles(
        //     watch(
        //         () => this.view.ready,
        //         (ready) => {
        //             if (ready) {
        //                 this.setup();
        //             } else {
        //                 this.dispose();
        //             }
        //         },
        //         { initial: true }
        //     )
        // );
    }

    dispose() { }
    setup() {


        this.threeRenderer = new THREE.WebGLRenderer({
            context: this.gl
        });
        this.threeRenderer.autoClearDepth = false;
        this.threeRenderer.autoClearColor = false;
        this.threeRenderer.autoClearStencil = false;
        this.threeRenderer.setSize(this.view.width, this.view.height);
        this.threeRenderer.setPixelRatio(window.devicePixelRatio);

        //const originalSetRenderTarget = this.threeRenderer.setRenderTarget.bind(this.threeRenderer);
        // this method doesn't seem to get called...
        // this.threeRenderer.setRenderTarget = function (target: THREE.WebGLRenderTarget) {
        //     if (target) {
        //         console.log("Running original", target);
        //         originalSetRenderTarget(target);
        //     }
        //     else if (target === null) {
        //         const output = this.bindRenderTarget();
        //         console.log("Running custom", output);
        //     }
        // };

        this.threeScene = new THREE.Scene();
        this.threeCamera = new THREE.PerspectiveCamera();
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.threeScene.add(
            this.directionalLight,
            this.ambientLight
        );

        // Create a cube
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.x = this.localOrigin[0];
        cube.position.y = this.localOrigin[1];
        cube.position.z = this.localOrigin[2];
        this.threeScene.add(cube);

    }

    override render(_inputs: ManagedFBO[]): ManagedFBO {
        this.resetWebGLState();
        const output = this.bindRenderTarget();

        this.threeRenderer = new THREE.WebGLRenderer({
            context: this.gl
        });
        this.threeRenderer.autoClearDepth = false;
        this.threeRenderer.autoClearColor = false;
        this.threeRenderer.autoClearStencil = false;
        this.threeRenderer.setSize(this.view.width, this.view.height);
        this.threeRenderer.setPixelRatio(window.devicePixelRatio);

        this.threeScene = new THREE.Scene();
        this.threeCamera = new THREE.PerspectiveCamera();
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.threeScene.add(
            this.directionalLight,
            this.ambientLight
        );

        // Create a cube
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.x = this.localOrigin[0];
        cube.position.y = this.localOrigin[1];
        cube.position.z = this.localOrigin[2];
        this.threeScene.add(cube);

        const c = this.camera;
        var direction = this.sunLight.direction;
        var diffuse = this.sunLight.diffuse;
        var ambient = this.sunLight.ambient;

        this.directionalLight.color.setRGB(diffuse.color[0], diffuse.color[1], diffuse.color[2]);
        this.directionalLight.intensity = diffuse.intensity;
        this.directionalLight.position.set(direction[0], direction[1], direction[2]);

        this.ambientLight.color.setRGB(ambient.color[0], ambient.color[1], ambient.color[2]);
        this.ambientLight.intensity = ambient.intensity;

        this.threeCamera.position.set(c.eye[0], c.eye[1], c.eye[2]);
        this.threeCamera.up.set(c.up[0], c.up[1], c.up[2]);
        this.threeCamera.lookAt(new THREE.Vector3(c.center[0], c.center[1], c.center[2]));
        this.threeCamera.projectionMatrix.fromArray(c.projectionMatrix);
        this.threeRenderer.render(this.threeScene, this.threeCamera);

        this.resetWebGLState();
        return output;
    }
}

new AddGeometryRenderPass({ view });
