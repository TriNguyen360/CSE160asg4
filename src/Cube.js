class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;

    // Front face (normal: [0, 0, -1])
    let frontVertices = [
      0,0,0,   1,1,0,   1,0,0,
      0,0,0,   0,1,0,   1,1,0
    ];
    let frontUV = [
      0,0,   1,1,   1,0,
      0,0,   0,1,   1,1
    ];
    let frontNormals = [];
    for (let i = 0; i < 6; i++) {
      frontNormals.push(0, 0, -1);
    }

    // Top face (normal: [0, 1, 0])
    let topVertices = [
      0,1,0,   0,1,1,   1,1,1,
      0,1,0,   1,1,1,   1,1,0
    ];
    let topUV = [
      0,0,   0,1,   1,1,
      0,0,   1,1,   1,0
    ];
    let topNormals = [];
    for (let i = 0; i < 6; i++) {
      topNormals.push(0, 1, 0);
    }

    // Back face (normal: [0, 0, 1])
    let backVertices = [
      0,0,1,   1,0,1,   1,1,1,
      0,0,1,   1,1,1,   0,1,1
    ];
    let backUV = [
      0,0,   1,0,   1,1,
      0,0,   1,1,   0,1
    ];
    let backNormals = [];
    for (let i = 0; i < 6; i++) {
      backNormals.push(0, 0, 1);
    }

    // Left face (normal: [-1, 0, 0])
    let leftVertices = [
      0,0,0,   0,0,1,   0,1,1,
      0,0,0,   0,1,1,   0,1,0
    ];
    let leftUV = [
      0,0,   1,0,   1,1,
      0,0,   1,1,   0,1
    ];
    let leftNormals = [];
    for (let i = 0; i < 6; i++) {
      leftNormals.push(-1, 0, 0);
    }

    // Right face (normal: [1, 0, 0])
    let rightVertices = [
      1,0,0,   1,1,1,   1,0,1,
      1,0,0,   1,1,0,   1,1,1
    ];
    let rightUV = [
      0,0,   1,1,   1,0,
      0,0,   0,1,   1,1
    ];
    let rightNormals = [];
    for (let i = 0; i < 6; i++) {
      rightNormals.push(1, 0, 0);
    }

    // Bottom face (normal: [0, -1, 0])
    let bottomVertices = [
      0,0,0,   1,0,1,   0,0,1,
      0,0,0,   1,0,0,   1,0,1
    ];
    let bottomUV = [
      0,0,   1,1,   0,1,
      0,0,   1,0,   1,1
    ];
    let bottomNormals = [];
    for (let i = 0; i < 6; i++) {
      bottomNormals.push(0, -1, 0);
    }

    this.vertices = new Float32Array(
      frontVertices.concat(topVertices, backVertices, leftVertices, rightVertices, bottomVertices)
    );
    this.uv = new Float32Array(
      frontUV.concat(topUV, backUV, leftUV, rightUV, bottomUV)
    );
    this.normals = new Float32Array(
      frontNormals.concat(topNormals, backNormals, leftNormals, rightNormals, bottomNormals)
    );

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
  }

  drawCube(M) {
    gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
