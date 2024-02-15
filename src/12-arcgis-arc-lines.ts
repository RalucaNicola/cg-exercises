import SceneView from '@arcgis/core/views/SceneView';
import { watch } from "@arcgis/core/core/reactiveUtils";
import * as webgl from "@arcgis/core/views/3d/webgl";
import { Point, SpatialReference } from "@arcgis/core/geometry";
import { mat4, vec3 } from 'gl-matrix';
import WebScene from '@arcgis/core/WebScene';
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import RenderNode from "@arcgis/core/views/3d/webgl/RenderNode";
import ManagedFBO from "@arcgis/core/views/3d/webgl/ManagedFBO";
import Color from "@arcgis/core/Color";
import Camera from '@arcgis/core/Camera';
import Papa from 'papaparse';
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import CSVLayer from '@arcgis/core/layers/CSVLayer';

const num_segments = 20;

const view = new SceneView({
    container: "viewDiv",
    map: new WebScene({
        portalItem: {
            id: "0e4333f1fd52435a8568ba7d09172b83"
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

const layer = new CSVLayer({ url: "data/cambridge_bike_station_information.csv" });

view.map.add(layer);


interface SimplePoint {
    x: number;
    y: number;
    z: number;
    color: Array<number>
}

const localOrigin = [-7914515.94730744, 5214711.499376282, 0];


function calculatePoints({ start, end }: { start: SimplePoint, end: SimplePoint }) {
    const points: Array<SimplePoint> = [];
    const { x: xs, y: ys } = start;
    const { x: xe, y: ye } = end;
    const xm = (xs + xe) / 2;
    const ym = (ys + ye) / 2;
    const new_xs = xs - xm;
    const new_ys = ys - ym;
    const new_xe = xe - xm;
    const new_ye = ye - ym;
    for (let i = 0; i < num_segments; i++) {
        const color = Color.blendColors(new Color([252, 144, 3, 0.1]), new Color([3, 215, 252, 1]), i / num_segments);
        const { r, g, b, a } = color;
        const n = num_segments - 1;
        const x = xs * i / n + xe * (n - i) / n;
        const y = ys * i / n + ye * (n - i) / n;
        const new_x = new_xs * i / n + new_xe * (n - i) / n;
        const new_y = new_ys * i / n + new_ye * (n - i) / n;
        const d = Math.sqrt(new_xe * new_xe + new_ye * new_ye);
        const z = d - (new_x * new_x + new_y * new_y) / d;
        points.push({ x, y, z: z / 2, color: [r, g, b, a * 255] });

    }
    return points;
}


@subclass("esri.views.3d.AddGeometryRenderPass")
class AddGeometryRenderNode extends RenderNode {
    consumes: __esri.ConsumedNodes = { required: ["transparent-color"] };
    produces: __esri.RenderNodeOutput = "transparent-color";

    points: Array<SimplePoint>;
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
    localOrigin: Float32Array = new Float32Array(localOrigin);
    localOriginSR: __esri.SpatialReference = SpatialReference.WebMercator;
    localOriginRender: any = null;
    tempMatrix4: mat4 = new Float32Array(16);

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

        const numPoints = this.points.length;
        const numCoordinates = 3;
        const numVertices = numCoordinates / 3;

        let positions = new Float32Array(numPoints * numCoordinates);
        let colors = new Float32Array(numPoints * 4);

        for (let i = 0; i < numPoints; ++i) {
            const { x, y, z, color } = this.points[i];
            const pointPositionRender = webgl.toRenderCoordinates(
                view,
                [x, y, z],
                0,
                this.localOriginSR,
                new Float32Array(3),
                0,
                1
            );
            for (let j = 0; j < numCoordinates; ++j) {
                positions[i * numCoordinates + j] = pointPositionRender[j];
            }
            for (let j = 0; j < 4; ++j) {
                colors[i * 4 + j] = color[j];
            }
        }

        this.vboPositions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.vboColor = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        console.log(colors);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

    }

    override render(_inputs: ManagedFBO[]): ManagedFBO {
        this.resetWebGLState();
        const output = this.bindRenderTarget();
        console.log(output, _inputs);
        const gl = this.gl;
        const time = performance.now();

        // Set some global WebGL state
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.vertexAttribPointer(this.programAttribVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        gl.vertexAttribPointer(this.programAttribVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexColor);

        gl.uniformMatrix4fv(this.programUniformProjectionMatrix, false, this.camera.projectionMatrix);
        mat4.identity(this.tempMatrix4);
        mat4.multiply(this.tempMatrix4, this.camera.viewMatrix as mat4, this.tempMatrix4);
        gl.uniformMatrix4fv(this.programUniformModelViewMatrix, false, this.tempMatrix4);
        for (let i = 0; i <= this.points.length; i += 20) {
            gl.drawArrays(gl.LINE_STRIP, i, 20);
        }

        this.resetWebGLState();
        return output;
    }
}

interface Trip {
    start_lng: string,
    start_lat: string,
    end_lng: string,
    end_lat: string
}

Papa.parse("./data/trips_0109_cambridge.csv", {
    delimiter: ",", download: true, header: true, complete: (result) => {

        const trips = result.data.map((trip: Trip) => {
            const { start_lng, start_lat, end_lng, end_lat } = trip;
            const [start_x, start_y] = webMercatorUtils.lngLatToXY(parseFloat(start_lng), parseFloat(start_lat));
            const [end_x, end_y] = webMercatorUtils.lngLatToXY(parseFloat(end_lng), parseFloat(end_lat));
            const start = {
                x: start_x,
                y: start_y,
                z: 0,
                color: [255, 0, 0, 100]
            }
            const end = {
                x: end_x,
                y: end_y,
                z: 0,
                color: [0, 255, 0, 100]
            }
            return calculatePoints({ start, end });
        });

        const points = trips.flat();
        new AddGeometryRenderNode({ view, points });
    }
});



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
