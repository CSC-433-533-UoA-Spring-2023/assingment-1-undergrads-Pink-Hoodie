/*
  Basic File I/O for displaying
  Skeleton Author: Joshua A. Levine
  Modified by: Amir Mohammad Esmaieeli Sikaroudi
  Email: amesmaieeli@email.arizona.edu
*/


//access DOM elements we'll use
var input = document.getElementById("load_image");
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// The width and height of the image
var width = 0;
var height = 0;
// The image data
var ppm_img_data;
var previousTime = 0.0;
var degreesPerSecond = 360/30;

//Function to process upload
var upload = function () {
    if (input.files.length > 0) {
        var file = input.files[0];
        console.log("You chose", file.name);
        if (file.type) console.log("It has type", file.type);
        var fReader = new FileReader();
        fReader.readAsBinaryString(file);

        fReader.onload = function(e) {
            //if successful, file data has the contents of the uploaded file
            var file_data = fReader.result;
            parsePPM(file_data);
        
            // Initial Call to start the animation recursion.
            rotateImage(0);

        }
    }
}

// Provide the transformation matrix to rotate the image around the center of the image.
function imageRotationMatrix(theta,xOffset,yOffset){
    var translationToImageCenterMatrix = GetTranslationMatrix(xOffset, yOffset);
    var rotationMatrix = GetRotationMatrix(-theta);
    var translationToCanvasCenterMatrix = InverseMatrix3x3(translationToImageCenterMatrix);
    var transformationMatrix1 = MultiplyMatrixMatrix(translationToImageCenterMatrix,rotationMatrix);
    var transformationMatrix2 = MultiplyMatrixMatrix(transformationMatrix1, translationToCanvasCenterMatrix);
    // Our resulting point is (X',Y'), our source point is (X, Y). 
    // Translate to the center of canvas is T
    // Translate to image center is T'
    // Rotation counter clockwise by theta is M_theta
    // Let V_S = (X, Y, 1), V_T = (X', Y', 1)
    // Then V_T = T'*M_theta*T*V_S
    // So T*V_T = M_theta*T*V_S
    // So M_theta'*T*V_T = T*V_S
    // So V_S = T'*M_theta'*T*V_T
    // So V_S = (T'*M_theta')*T*V_T = ((T'*M_theta')*T)*V_T
    return transformationMatrix2;
}

// Rotate the original image by theta degrees and animate it.
function rotateImage(theta){
    var newImageData = ctx.createImageData(width, height);
    var xOffset = width/2;
    var yOffset = height/2;
    var newRotationMatrix = imageRotationMatrix(theta,xOffset,yOffset);
    //#TODO: Reconfigure it so we are reading from the image.
    for (var i = 0; i < ppm_img_data.data.length; i += 4) {
        // Get the pixel location in x and y with (0,0) being the top left of the image
        var pixel = [Math.floor(i / 4) % width, 
                     Math.floor(i / 4) / width, 1];

        // Get the location of the sample pixel
        var samplePixel = MultiplyMatrixVector(newRotationMatrix, pixel);

        // Floor pixel to integer
        samplePixel[0] = Math.floor(samplePixel[0]);
        samplePixel[1] = Math.floor(samplePixel[1]);

        setPixelColor(newImageData, samplePixel, i);
    }

    // Draw the new image
    ctx.putImageData(newImageData, canvas.width/2 - width/2, canvas.height/2 - height/2);
    showMatrix(newRotationMatrix);

    // WebGL API used for animation.
    requestAnimationFrame((currentTime) => {
        theta = (theta+degreesPerSecond)%360;
    
        previousTime = currentTime;
        rotateImage(theta);
    });
    

}

// Show transformation matrix on HTML
function showMatrix(matrix){
    for(let i=0;i<matrix.length;i++){
        for(let j=0;j<matrix[i].length;j++){
            matrix[i][j]=Math.floor((matrix[i][j]*100))/100;
        }
    }
    document.getElementById("row1").innerHTML = "row 1:[ " + matrix[0].toString().replaceAll(",",",\t") + " ]";
    document.getElementById("row2").innerHTML = "row 2:[ " + matrix[1].toString().replaceAll(",",",\t") + " ]";
    document.getElementById("row3").innerHTML = "row 3:[ " + matrix[2].toString().replaceAll(",",",\t") + " ]";
}

// Sets the color of a pixel in the new image data
function setPixelColor(newImageData, samplePixel, i){
    var offset = ((samplePixel[1] - 1) * width + samplePixel[0] - 1) * 4;

    // Set the new pixel color
    newImageData.data[i    ] = ppm_img_data.data[offset    ];
    newImageData.data[i + 1] = ppm_img_data.data[offset + 1];
    newImageData.data[i + 2] = ppm_img_data.data[offset + 2];
    newImageData.data[i + 3] = 255;
}

// Load PPM Image to Canvas
// Untouched from the original code
function parsePPM(file_data){
    /*
   * Extract header
   */
    var format = "";
    var max_v = 0;
    var lines = file_data.split(/#[^\n]*\s*|\s+/); // split text by whitespace or text following '#' ending with whitespace
    var counter = 0;
    // get attributes
    for(var i = 0; i < lines.length; i ++){
        if(lines[i].length == 0) {continue;} //in case, it gets nothing, just skip it
        if(counter == 0){
            format = lines[i];
        }else if(counter == 1){
            width = lines[i];
        }else if(counter == 2){
            height = lines[i];
        }else if(counter == 3){
            max_v = Number(lines[i]);
        }else if(counter > 3){
            break;
        }
        counter ++;
    }
    console.log("Format: " + format);
    console.log("Width: " + width);
    console.log("Height: " + height);
    console.log("Max Value: " + max_v);
    /*
     * Extract Pixel Data
     */
    var bytes = new Uint8Array(3 * width * height);  // i-th R pixel is at 3 * i; i-th G is at 3 * i + 1; etc.
    // i-th pixel is on Row i / width and on Column i % width
    // Raw data must be last 3 X W X H bytes of the image file
    var raw_data = file_data.substring(file_data.length - width * height * 3);
    for(var i = 0; i < width * height * 3; i ++){
        // convert raw data byte-by-byte
        bytes[i] = raw_data.charCodeAt(i);
    }
    // update width and height of canvas
    document.getElementById("canvas").setAttribute("width", window.innerWidth);
    document.getElementById("canvas").setAttribute("height", window.innerHeight);
    // create ImageData object
    var image_data = ctx.createImageData(width, height);
    // fill ImageData
    for(var i = 0; i < image_data.data.length; i+= 4){
        let pixel_pos = parseInt(i / 4);
        image_data.data[i + 0] = bytes[pixel_pos * 3 + 0]; // Red ~ i + 0
        image_data.data[i + 1] = bytes[pixel_pos * 3 + 1]; // Green ~ i + 1
        image_data.data[i + 2] = bytes[pixel_pos * 3 + 2]; // Blue ~ i + 2
        image_data.data[i + 3] = 255; // A channel is deafult to 255
    }
    ctx.putImageData(image_data, canvas.width/2 - width/2, canvas.height/2 - height/2);
    //ppm_img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);   // This gives more than just the image I want??? I think it grabs white space from top left?
    ppm_img_data = image_data;
}

//Connect event listeners
input.addEventListener("change", upload);
