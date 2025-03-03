let canvas;
let gl;

let a_Position;
let a_UV;
let a_Normal;

let u_FragColor;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_whichTexture;
let u_isNormalDebug;
let u_cameraPos;
var u_lightPos;
var g_lightPos = [0,2,1];
let u_LightColor;
let g_lightColor = [1, 1, 0, 1];

let camera;
let g_cameraAngle = 180;

let g_normalDebug = false;

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;
let g_Animation = true;

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;  

  varying vec2 v_UV;
  varying vec3 v_Normal;    
  varying vec4 v_VertPos;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;  
    v_VertPos = u_ModelMatrix * a_Position; 
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;

  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;

  uniform int u_whichTexture;
  uniform int u_isNormalDebug; 

  uniform vec3 u_LightPos;
  uniform vec3 u_cameraPos;
  uniform bool u_lightOn;
  uniform vec3 u_LightColor;

  void main() {
    vec3 baseColor;
    if (u_whichTexture == 0) {
      // Sample the texture and use its color.
      baseColor = texture2D(u_Sampler0, v_UV).rgb;
    } else if (u_isNormalDebug == 1) {
      // Use mapped normals as the base color.
      baseColor = (v_Normal + vec3(1.0)) * 0.5;
    } else if (u_whichTexture == -2) {
      baseColor = u_FragColor.rgb;
    } else if (u_whichTexture == -1) {
      baseColor = vec3(v_UV, 1.0);
    } else {
      baseColor = vec3(1.0, 0.2, 0.2);
    }

    // Compute lighting:
    vec3 lightVector = u_LightPos - vec3(v_VertPos);
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    vec3 R = reflect(-L, N);
    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
    float specular = pow(max(dot(E, R), 0.0), 20.0);

    vec3 diffuse = baseColor * nDotL * 0.7 * u_LightColor;
    vec3 ambient = baseColor * 0.3 * u_LightColor;
    gl_FragColor = vec4(specular + diffuse + ambient, 1.0);
  }
`;




function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL.");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log("Failed to get the storage location of a_Normal");
    return;
  }

  u_FragColor       = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix     = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix      = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix= gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_whichTexture    = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_isNormalDebug   = gl.getUniformLocation(gl.program, 'u_isNormalDebug');

  if(!u_isNormalDebug) {
    console.log("Failed to get u_isNormalDebug location");
    return;
  }

  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  if(!u_LightPos) {
    console.log("Failed to get u_LightPos location");
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if(!u_cameraPos) {
    console.log("Failed to get u_cameraPos location");
    return;
  }

  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  if(!u_LightColor) {
    console.log("Failed to get u_LightColor location");
    return;
  }

  let identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function initTextures() {
  let image = new Image();
  let u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log("Failed to get uniform for texture0.");
    return;
  }

  image.onload = function() {
    let texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGB,
      gl.RGB, gl.UNSIGNED_BYTE, image
    );
    gl.uniform1i(u_Sampler0, 0);

    renderScene();
  };
  image.src = 'ground.png';
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  camera = new Camera();

  initTextures();

  let angleSlider = document.getElementById('cameraAngle');
  if (angleSlider) {
    angleSlider.value = g_cameraAngle;
    angleSlider.addEventListener('input', function() {
      updateCameraAngle(this.value);
    });
  }

  let slideX = document.getElementById('lightSlideX');
  let slideY = document.getElementById('lightSlideY');
  let slideZ = document.getElementById('lightSlideZ');
  if(slideX){
    slideX.addEventListener('input', function(){
      g_lightPos[0] = parseFloat(this.value) / 20.0; // scale it
      renderScene();
    });
  }
  if(slideY){
    slideY.addEventListener('input', function(){
      g_lightPos[1] = parseFloat(this.value) / 20.0;
      renderScene();
    });
  }
  if(slideZ){
    slideZ.addEventListener('input', function(){
      g_lightPos[2] = parseFloat(this.value) / 20.0;
      renderScene();
    });
  }

  let slideRed = document.getElementById('lightRed');
  let slideGreen = document.getElementById('lightGreen');
  let slideBlue = document.getElementById('lightBlue');

  if (slideRed && slideGreen && slideBlue) {
    function updateLightColor() {
      g_lightColor[0] = parseFloat(slideRed.value) / 256.0;
      g_lightColor[1] = parseFloat(slideGreen.value) / 256.0;
      g_lightColor[2] = parseFloat(slideBlue.value) / 256.0;
      renderScene();
    }
    

    slideRed.addEventListener('input', updateLightColor);
    slideGreen.addEventListener('input', updateLightColor);
    slideBlue.addEventListener('input', updateLightColor);

    updateLightColor(); 
  }


  
  updateCameraAngle(g_cameraAngle);

  gl.clearColor(0, 0, 0, 1);
  renderScene();
  requestAnimationFrame(tick);

}

function tick(){
  g_seconds = performance.now()/1000.0 - g_startTime;
  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles(){
  if(g_Animation){
    g_jointAngle = 10*Math.sin(g_seconds);
    head_animation = 15*Math.sin(g_seconds);

    g_lightPos[0] = 2 * Math.cos(g_seconds);
    g_lightPos[2] = 2 * Math.sin(g_seconds);
  }
}

function updateCameraAngle(angleDegrees) {
  g_cameraAngle = angleDegrees;
  let radius = 8;
  let rad = angleDegrees * Math.PI / 180;
  let x = radius * Math.sin(rad);
  let z = radius * Math.cos(rad);

  camera.eye.elements[0] = x;
  camera.eye.elements[1] = 1.5;
  camera.eye.elements[2] = z;

  camera.at.elements[0] = 0;
  camera.at.elements[1] = 0.75;
  camera.at.elements[2] = 0;

  renderScene();
}

function renderScene() {
  let startTime = performance.now();

  let projMat = new Matrix4();
  projMat.setPerspective(50, canvas.width / canvas.height, 1, 200);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  camera.updateViewMatrix();
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform1i(u_isNormalDebug, g_normalDebug ? 1 : 0);

  gl.uniform3f(u_LightPos,
    g_lightPos[0],
    g_lightPos[1],
    g_lightPos[2]
  );

  gl.uniform3f(u_cameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);

  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  // === FLOOR ===
  let floor = new Cube();
  floor.color = [1, 1, 1, 1];
  floor.textureNum = 0; 
  let floorMatrix = new Matrix4();
  floorMatrix.translate(0, -0.675, 0);
  floorMatrix.scale(15, 0.1, 15);
  floorMatrix.translate(-0.5, 0, -0.5);
  floor.drawCube(floorMatrix);

  // === FRONT WALL ===
  let frontWall = new Cube();
  frontWall.color = [0.8, 0.8, 0.8, 1];
  frontWall.textureNum = -2;
  let fwM = new Matrix4();
  fwM.translate(0, 1.2, -7.5);
  fwM.scale(15, 3.75, 0.075);
  fwM.translate(-0.5, -0.5, -0.5);
  frontWall.drawCube(fwM);

  // === BACK WALL ===
  let backWall = new Cube();
  backWall.color = [0.85, 0.85, 0.85, 1];
  backWall.textureNum = -2;
  let bwM = new Matrix4();
  bwM.translate(0, 1.2, 7.5);
  bwM.scale(15, 3.75, 0.075);
  bwM.translate(-0.5, -0.5, -0.5);
  backWall.drawCube(bwM);

  // === LEFT WALL ===
  let leftWall = new Cube();
  leftWall.color = [0.75, 0.75, 0.75, 1];
  leftWall.textureNum = -2;
  let lwM = new Matrix4();
  lwM.translate(-7.5, 1.2, 0);
  lwM.scale(0.075, 3.75, 15);
  lwM.translate(-0.5, -0.5, -0.5);
  leftWall.drawCube(lwM);

  // === RIGHT WALL ===
  let rightWall = new Cube();
  rightWall.color = [0.7, 0.7, 0.7, 1];
  rightWall.textureNum = -2;
  let rwM = new Matrix4();
  rwM.translate(7.5, 1.2, 0);
  rwM.scale(0.075, 3.75, 15);
  rwM.translate(-0.5, -0.5, -0.5);
  rightWall.drawCube(rwM);

  // === CEILING ===
  let ceiling = new Cube();
  ceiling.color = [0.9, 0.9, 0.9, 1];
  ceiling.textureNum = -2;
  let cM = new Matrix4();
  cM.translate(0, 3.0375, 0);
  cM.scale(15, 0.075, 15);
  cM.translate(-0.5, -0.5, -0.5);
  ceiling.drawCube(cM);

  // === FOX ===
  drawFox();

  // === SPHERE ===
  let sphere = new Sphere();
  sphere.color = [1.0, 0.55, 0.0, 1.0];
  sphere.textureNum = -2; 
  sphere.matrix.translate(2, 0.5, 0);    
  sphere.matrix.scale(1, 1, 1); 
  sphere.render();

  // === Draw the Light ===
  var light = new Cube();
  light.color = [2,2,0,1];
  let lightMatrix = new Matrix4();
  lightMatrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  lightMatrix.scale(-0.1, -0.1, -0.1);
  lightMatrix.translate(-0.5, -0.5, -0.5);
  light.drawCube(lightMatrix);


  // Performance
  let duration = performance.now() - startTime;
  let fps = Math.floor(1000 / duration);
  sendTextToHTML("Frame: " + duration.toFixed(1) + " ms | FPS: " + fps, "performance");
}

function drawFox() {
  let foxOrange = [1.0, 0.55, 0.0, 1.0];
  let foxCream  = [1.0, 0.85, 0.6, 1.0];

  let globalXform = new Matrix4();
  globalXform.setTranslate(0, -0.3, 0);
  globalXform.scale(2.25, 2.25, 2.25);

  // Body
  let body = new Cube();
  body.color = foxOrange;
  body.textureNum = -2;
  let bodyMatrix = new Matrix4(globalXform);
  bodyMatrix.scale(0.30, 0.20, 0.50);
  bodyMatrix.translate(-0.5, 0, -0.25);
  body.drawCube(bodyMatrix);

  // Head
  let head = new Cube();
  head.color = foxOrange;
  head.textureNum = -2;
  let headMatrix = new Matrix4(globalXform);
  headMatrix.scale(0.35, 0.35, 0.35);
  headMatrix.translate(-0.5, 0.25, -1.25);
  head.drawCube(headMatrix);

  // Thighs
  let animThigh = 0;
  let thighFL = new Cube();
  thighFL.color = foxOrange;
  thighFL.textureNum = -2;
  let flM = new Matrix4(globalXform);
  flM.rotate(animThigh, 0, 0, 1);
  flM.scale(0.10, -0.10, 0.10);
  flM.translate(-1.15, -0.25, -0.75);
  thighFL.drawCube(flM);

  let thighFR = new Cube();
  thighFR.color = foxOrange;
  thighFR.textureNum = -2;
  let frM = new Matrix4(globalXform);
  frM.rotate(animThigh, 0, 0, 1);
  frM.scale(0.10, -0.10, 0.10);
  frM.translate(0.2, -0.25, -0.75);
  thighFR.drawCube(frM);

  let thighBL = new Cube();
  thighBL.color = foxOrange;
  thighBL.textureNum = -2;
  let blM = new Matrix4(globalXform);
  blM.rotate(animThigh, 0, 0, 1);
  blM.scale(0.10, -0.10, 0.10);
  blM.translate(-1.15, -0.25, 1.5);
  thighBL.drawCube(blM);

  let thighBR = new Cube();
  thighBR.color = foxOrange;
  thighBR.textureNum = -2;
  let brM = new Matrix4(globalXform);
  brM.rotate(animThigh, 0, 0, 1);
  brM.scale(0.10, -0.10, 0.10);
  brM.translate(0.2, -0.25, 1.5);
  thighBR.drawCube(brM);

  // Calves
  let animCalf = 0;
  let calfFL = new Cube();
  calfFL.color = foxCream;
  calfFL.textureNum = -2;
  let cflM = new Matrix4(flM);
  cflM.rotate(animCalf, 0, 0, 1);
  cflM.scale(0.08, 0.08, 0.08);
  cflM.translate(-1.25, -1.75, -0.8);
  calfFL.drawCube(cflM);

  let calfFR = new Cube();
  calfFR.color = foxCream;
  calfFR.textureNum = -2;
  let cfrM = new Matrix4(frM);
  cfrM.rotate(animCalf, 0, 0, 1);
  cfrM.scale(0.08, 0.08, 0.08);
  cfrM.translate(0.37, -1.75, -0.8);
  calfFR.drawCube(cfrM);

  let calfBL = new Cube();
  calfBL.color = foxCream;
  calfBL.textureNum = -2;
  let cblM = new Matrix4(blM);
  cblM.rotate(animCalf, 0, 0, 1);
  cblM.scale(0.08, 0.08, 0.08);
  cblM.translate(-1.25, -1.75, 2);
  calfBL.drawCube(cblM);

  let calfBR = new Cube();
  calfBR.color = foxCream;
  calfBR.textureNum = -2;
  let cbrM = new Matrix4(brM);
  cbrM.rotate(animCalf, 0, 0, 1);
  cbrM.scale(0.08, 0.08, 0.08);
  cbrM.translate(0.37, -1.75, 2);
  calfBR.drawCube(cbrM);
}

function toggleNormalDebug() {
  g_normalDebug = !g_normalDebug;
  renderScene();
}

function sendTextToHTML(text, htmlID) {
  let htmlElm = document.getElementById(htmlID);
  if (!htmlElm) return;
  htmlElm.innerHTML = text;
}

function toggleLightAnimation() {
  g_Animation = !g_Animation;
}
