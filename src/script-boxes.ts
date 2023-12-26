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


function createCubeVertices(size: number) {
    const k = size / 2;
    const positions = new Float32Array([
        k, -k, k, // 0
        k, k, k, // 1
        -k, k, k,   // 2
        -k, -k, k, // 3
        k, -k, -k, // 4
        k, k, -k,   // 5
        -k, k, -k,  // 6
        -k, -k, -k  // 7
    ]);
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
    return { positions, colors, indices };

}

type CubeParameters = {
    xTranslation: number,
    yTranslation: number,
    zTranslation: number
}

function main() {
    const cubes: CubeParameters[] = [];
    for (let i = 0; i < 100; i++) {
        cubes.push({
            xTranslation: 50 - Math.random() * 100,
            yTranslation: 50 - Math.random() * 100,
            zTranslation: 50 - Math.random() * 100,
        })
    }
    // Get a WebGL context
    const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) {
        console.error('WebGL not supported');
    }

    // Initialize shaders
    const vsSource = `
    attribute vec4 a_position;
    attribute vec4 a_color;
    
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    varying vec4 v_Color;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_position;
        v_Color = a_color;
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

    // Get uniform locations
    const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
    const uViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");

    const { positions, colors, indices } = createCubeVertices(10);
    const attributes = {
        a_position: {
            data: positions,
            numComponents: 3,
            type: gl.FLOAT,
            normalize: false
        },
        a_color: {
            data: colors,
            numComponents: 3,
            type: gl.UNSIGNED_BYTE,
            normalize: true
        }
    }
    setAttributes(gl, program, attributes);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
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




        cubes.forEach((cube) => {
            const modelMatrix = mat4.create();
            mat4.scale(modelMatrix, modelMatrix, [0.005, 0.005, 0.005]);
            mat4.translate(modelMatrix, modelMatrix, [cube.xTranslation, cube.yTranslation, cube.zTranslation]);
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
        });

        // // Compute model matrix
        // const modelMatrix = mat4.create();
        // mat4.scale(modelMatrix, modelMatrix, [0.1, 0.1, 0.1]);
        // gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

        // gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

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

function setAttributes(gl: WebGLRenderingContext, program: WebGLProgram, attributes: any) {
    Object.keys(attributes).forEach((name) => {
        const attribute = attributes[name];
        const location = gl.getAttribLocation(program, name);
        console.log(attribute);
        if (attribute.data) {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, attribute.data, gl.STATIC_DRAW);
        }
        gl.vertexAttribPointer(location, attribute.numComponents, attribute.type, attribute.normalize, 0, 0);
        gl.enableVertexAttribArray(location);
    });
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