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
    renderer: THREE.WebGLRenderer;
    threeScene: THREE.Scene;
    threeCamera: THREE.PerspectiveCamera;
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;

    initialize(): void {
        this.addHandles(
            watch(
                () => this.view.ready,
                (ready) => {
                    if (ready) {
                        this.setup();
                    } else {
                        this.dispose();
                    }
                },
                { initial: true }
            )
        );
    }

    dispose() { }
    setup() {
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
        console.log(cube);
        this.threeScene.add(cube);
    }

    override render(_inputs: ManagedFBO[]): ManagedFBO {
        this.resetWebGLState();
        const output = this.bindRenderTarget();
        const gl = this.gl;
        const c = this.camera;
        this.renderer = new THREE.WebGLRenderer({
            context: gl
        });
        this.renderer.setSize(this.view.width, this.view.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

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
        this.renderer.render(this.threeScene, this.threeCamera);
        this.requestRender();

        this.resetWebGLState();
        return output;
    }
}

new AddGeometryRenderPass({ view });

function createCubeVertices(size: number) {
    const k = size / 2;
    const positions = new Float32Array([
        k,
        -k,
        k, // 0
        k,
        k,
        k, // 1
        -k,
        k,
        k, // 2
        -k,
        -k,
        k, // 3
        k,
        -k,
        -k, // 4
        k,
        k,
        -k, // 5
        -k,
        k,
        -k, // 6
        -k,
        -k,
        -k // 7
    ]);
    const colors = new Uint8Array([
        255,
        0,
        0, // 0
        0,
        0,
        255, // 1
        0,
        0,
        255, // 2
        255,
        0,
        0, // 3
        255,
        0,
        0, // 4
        0,
        0,
        255, // 5
        0,
        0,
        255, // 6
        255,
        0,
        0 // 7
    ]);
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, 0, 5, 1, 0, 4, 5, 0, 7, 4, 0, 3, 7, 4, 6, 5, 4, 7, 6, 1, 5, 6, 1, 6, 2, 3, 6,
        7, 3, 2, 6
    ]);
    return { positions, colors, indices };
}
