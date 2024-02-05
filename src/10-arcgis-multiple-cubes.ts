import SceneView from '@arcgis/core/views/SceneView';
import { watch } from "@arcgis/core/core/reactiveUtils";
import * as webgl from "@arcgis/core/views/3d/webgl";
import { SpatialReference } from "@arcgis/core/geometry";
import { mat4, vec3 } from 'gl-matrix';
import WebScene from '@arcgis/core/WebScene';
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import RenderNode from "@arcgis/core/views/3d/webgl/RenderNode";
import ManagedFBO from "@arcgis/core/views/3d/webgl/ManagedFBO";

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

const points = [{
    x: 950838.5674710117,
    y: 6002143.45547464,
    z: 450
}, {
    x: 950725.2286767137,
    y: 6002107.151670563,
    z: 450
},
{
    x: 950764.2510258518,
    y: 6002207.418580964,
    z: 450
}, {
    x: 950691.491676274,
    y: 6002265.997617188,
    z: 450,
    color: [255, 255, 0]
}]


@subclass("esri.views.3d.AddGeometryRenderPass")
class AddGeometryRenderPass extends RenderNode {
    consumes: __esri.ConsumedNodes = { required: ["opaque-color"] };
    produces: __esri.RenderNodeOutput = "opaque-color";

    program: WebGLProgram;
    programAttribVertexPosition: ArrayBuffer = null;
    programAttribVertexColor: ArrayBuffer = null;
    programUniformProjectionMatrix: ArrayBuffer = null;
    programUniformModelViewMatrix: ArrayBuffer = null;
    vboPositions: WebGLBuffer = null;
    vao: WebGLVertexArrayObject = null;
    vboColor: WebGLBuffer = null;
    ibo: WebGLBuffer = null;
    // local origin x,y,z -> the cube will draw relative to this
    localOrigin: Float32Array = new Float32Array([950763.6511, 6002193.8497, 450]);
    localOriginSR: __esri.SpatialReference = SpatialReference.WebMercator;
    localOriginRender: any = null;
    tempMatrix4: mat4 = new Float32Array(16);
    allCubeIndices: Uint16Array = null;

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
        if (!this.program) {
            this.initShaders();
            this.initData();
        }
    }

    initShaders() {
        const gl = this.gl;

        // Initialize shaders
        const vsSource = `#version 300 es
        in vec4 a_position;
        in vec4 a_color;
        uniform mat4 u_projectionMatrix;
        uniform mat4 u_modelViewMatrix;

        out vec4 v_color;

        void main() {
            gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
            v_color = a_color;
        }
    `;

        const fsSource = `#version 300 es
        precision highp float;
        in vec4 v_color;    
        out vec4 fragColor;
        void main() {
            fragColor = v_color;
        }
    `;

        // Setup GLSL program
        this.program = createProgram(gl, vsSource, fsSource);
        if (!this.program) {
            alert("Could not initialize shaders");
        }

        // Program attributes
        this.programAttribVertexPosition = gl.getAttribLocation(this.program, "a_position");
        this.programAttribVertexColor = gl.getAttribLocation(this.program, "a_color");
        // Program uniforms
        this.programUniformProjectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.programUniformModelViewMatrix = gl.getUniformLocation(this.program, "u_modelViewMatrix");
    }

    initData() {

        const gl = this.gl;

        this.localOriginRender = webgl.toRenderCoordinates(
            view,
            this.localOrigin,
            0,
            this.localOriginSR,
            new Float32Array(3),
            0,
            1
        );
        const { positions: cubePositions, colors: cubeColors, indices: cubeIndices } = createCubeVertices(10);

        const numPoints = points.length;
        const numCoordinates = cubePositions.length;
        const numVertices = numCoordinates / 3;

        let allCubePositions = new Float32Array(numPoints * numCoordinates);
        let allCubeColors = new Float32Array(numPoints * cubeColors.length);
        this.allCubeIndices = new Uint16Array(numPoints * cubeIndices.length);


        for (let i = 0; i < numPoints; ++i) {
            const { x, y, z } = points[i];
            const inputToRender = webgl.renderCoordinateTransformAt(view, [x, y, z], view.spatialReference, new Float32Array(16)) as mat4;

            for (let j = 0; j < numCoordinates; ++j) {
                allCubePositions[i * numCoordinates + j] = cubePositions[j];
                allCubeColors[i * cubeColors.length + j] = cubeColors[j];
            }

            vec3.forEach(allCubePositions, 0, i * numCoordinates, numVertices, vec3.transformMat4, inputToRender);
            vec3.forEach(allCubePositions, 0, i * numCoordinates, numVertices, vec3.subtract, this.localOriginRender);

            const numIndices = cubeIndices.length;
            for (let j = 0; j < numIndices; ++j) {
                this.allCubeIndices[i * numIndices + j] += cubeIndices[j] + i * numVertices;
            }

        }

        this.vboPositions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allCubePositions), gl.STATIC_DRAW);

        this.vboColor = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(allCubeColors), gl.STATIC_DRAW);

        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.allCubeIndices, gl.STATIC_DRAW);

    }

    override render(_inputs: ManagedFBO[]): ManagedFBO {
        this.resetWebGLState();
        const output = this.bindRenderTarget();
        const gl = this.gl;
        const time = performance.now();

        // Set some global WebGL state
        gl.enable(gl.DEPTH_TEST);
        //gl.disable(gl.CULL_FACE);
        //gl.disable(gl.BLEND);
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.vertexAttribPointer(this.programAttribVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        gl.vertexAttribPointer(this.programAttribVertexColor, 3, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexColor);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

        gl.uniformMatrix4fv(this.programUniformProjectionMatrix, false, this.camera.projectionMatrix);
        mat4.identity(this.tempMatrix4);
        mat4.translate(this.tempMatrix4, this.tempMatrix4, this.localOriginRender);
        mat4.multiply(this.tempMatrix4, this.camera.viewMatrix as mat4, this.tempMatrix4);
        gl.uniformMatrix4fv(this.programUniformModelViewMatrix, false, this.tempMatrix4);

        gl.drawElements(gl.TRIANGLES, this.allCubeIndices.length, gl.UNSIGNED_SHORT, 0);
        this.requestRender();

        this.resetWebGLState();
        return output;
    }
}

new AddGeometryRenderPass({ view });

function createShader(gl: WebGL2RenderingContext, src: string, type: number): WebGLShader | null {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
        return;
    }
    return shader;
}

function createProgram(
    gl: WebGL2RenderingContext,
    vsSource: string,
    fsSource: string
): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        console.error("Failed to create program");
    }
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    gl.attachShader(program, vertexShader);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error("Failed to link program: " + gl.getProgramInfoLog(program));
    }
    return program;
}

function degToRad(angle: number) {
    return (angle * Math.PI) / 180;
}

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
