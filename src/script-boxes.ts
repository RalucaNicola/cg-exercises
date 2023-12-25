import GUI from 'lil-gui';
import { mat4 } from 'gl-matrix';

// matrix parameters
const scale = {
    x: 1,
    y: 1,
    z: 1
}
const rotate = {
    x: 0,
    y: 0,
    z: 0
}
const translate = {
    x: 0,
    y: 0,
    z: -1
}
const projection = {
    fov: 45,
    near: 0.1,
    far: 100
}


function setUpGUI() {

    const gui = new GUI();

    const scaleFolder = gui.addFolder('Scale');

    scaleFolder.add(scale, "x", 0, 10, 0.1);
    scaleFolder.add(scale, "y", 0, 10, 0.1);
    scaleFolder.add(scale, "z", 0, 10, 0.1);

    const rotationFolder = gui.addFolder('Rotation');

    rotationFolder.add(rotate, "x", 0, 180, 1);
    rotationFolder.add(rotate, "y", 0, 180, 1);
    rotationFolder.add(rotate, "z", 0, 180, 1);

    const translationFolder = gui.addFolder('Translation');

    translationFolder.add(translate, "x", -10, 10, 0.1);
    translationFolder.add(translate, "y", -10, 10, 0.1);
    translationFolder.add(translate, "z", -10, 10, 0.1);

    const projectionFolder = gui.addFolder('Projection');


    projectionFolder.add(projection, "fov", 0, 180, 1);
    projectionFolder.add(projection, "near", 0, 10, 0.1);
    projectionFolder.add(projection, "far", 0, 100, 0.1);

}

// UI sliders to configure matrix parameters
setUpGUI();


function main() {
    const dim = 3;
    // Get a WebGL context
    const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) {
        console.error('WebGL not supported');
    }

    // Initialize shaders
    const vsSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    varying vec4 v_Color;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
        v_Color = a_Color;
    }
    `;

    const fsSource = `
    precision mediump float;
    
    varying vec4 v_Color;
    
    void main() {
        gl_FragColor = v_Color;
    }
    `;

    // Setup GLSL program
    const program = createProgram(gl, vsSource, fsSource);
    gl.useProgram(program);

    // Look up vertex data locations
    const positionLocation = gl.getAttribLocation(program, 'a_Position');
    const colorLocation = gl.getAttribLocation(program, 'a_Color');

    // Get uniform locations
    const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
    const uViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");

    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // The vertices of a cube
    const vertices = new Float32Array([
        10.0, 0.0, 10.0, // 0
        10.0, 10.0, 10.0, // 1
        0.0, 10.0, 10.0, // 2
        0.0, 0.0, 10.0, // 3
        10.0, 0.0, 0.0, // 4
        10.0, 10.0, 0.0, // 5
        0.0, 10.0, 0.0, // 6
        0.0, 0.0, 0.0 // 7
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(positionLocation, dim, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    // Create a buffer to put colors in
    const colorBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //Put colors into buffer
    const colors = new Uint8Array([
        0, 0, 255, // 0
        0, 255, 0, // 1
        0, 255, 0, // 2
        0, 0, 255, // 3
        255, 0, 0, // 4
        0, 255, 0, // 5
        0, 255, 0, // 6
        255, 0, 0 // 7
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.vertexAttribPointer(colorLocation, dim, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.enableVertexAttribArray(colorLocation);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3,
        0, 5, 1,
        0, 4, 5,
        0, 7, 4,
        0, 3, 7,
        4, 6, 5,
        4, 7, 6,
        1, 5, 6,
        1, 6, 2,
        3, 6, 7,
        3, 2, 6
    ]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    function drawScene() {
        const { width, height } = resizeCanvasToDisplaySize(canvas);

        gl.viewport(0, 0, width, height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything

        // tell webgl to cull faces
        gl.enable(gl.CULL_FACE);

        // turn on depth testing
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Compute model matrix
        const modelMatrix = mat4.create();
        mat4.scale(modelMatrix, modelMatrix, [0.05, 0.05, 0.05]);
        mat4.translate(modelMatrix, modelMatrix, [-2, 0, 0]);

        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

        // Compute view matrix
        const viewMatrix = mat4.create();
        mat4.translate(viewMatrix, viewMatrix, [translate.x, translate.y, translate.z]);
        mat4.rotateX(viewMatrix, viewMatrix, degToRad(rotate.x));
        mat4.rotateY(viewMatrix, viewMatrix, degToRad(rotate.y));
        mat4.rotateZ(viewMatrix, viewMatrix, degToRad(rotate.z));
        mat4.scale(viewMatrix, viewMatrix, [scale.x, scale.y, scale.z]);

        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);

        // Compute projection matrix
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, degToRad(projection.fov), width / height, projection.near, projection.far);
        // mat4.ortho(projectionMatrix, -width / 256, width / 256, -height / 256, height / 256, projection.near, projection.far);
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        const modelMatrix2 = mat4.create();
        mat4.scale(modelMatrix2, modelMatrix2, [0.05, 0.05, 0.05]);
        mat4.translate(modelMatrix2, modelMatrix2, [-20, 0, 0]);
        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix2);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        const modelMatrix3 = mat4.create();
        mat4.scale(modelMatrix3, modelMatrix3, [0.05, 0.05, 0.05]);
        mat4.translate(modelMatrix3, modelMatrix3, [20, 0, 0]);
        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix3);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }
    window.requestAnimationFrame(function renderLoop() {
        drawScene();
        window.requestAnimationFrame(renderLoop);
    });
}

main();


/**
 * Helper functions
 */

function setAttributes() {

}


/**
 * Creates and compiles shaders from a string source.
 * @param {WebGLRenderingContext} gl The WebGLRenderingContext to use.
 * @param {string} src The shader source.
 * @param {number} shaderType The type of shader.
 * @returns {WebGLShader} The shader.
 */
function createShader(gl: WebGLRenderingContext, src: string, type: number): WebGLShader {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
        return;
    }
    return shader;
}

/**
 * Creates a program, attaches shaders.
 * @param {WebGLRenderingContext} gl The rendering context
 * @param {string} vsSource The vertex shader source
 * @param {string} fsSource The fragment shader source
 * @returns {WebGLProgram} The program
 */
function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        console.error('Failed to create program');
    }
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    gl.attachShader(program, vertexShader);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error('Failed to link program: ' + gl.getProgramInfoLog(program));
    }
    return program;
}

/**
 * Resize a canvas to match the size its displayed.
 * @param {HTMLCanvasElement} canvas The canvas to resize.
 */
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    const width = canvas.clientWidth | 0;
    const height = canvas.clientHeight | 0;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    return { width, height };
}


function degToRad(d: number) {
    return d * Math.PI / 180;
}