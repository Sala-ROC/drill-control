var htmlfile = new ActiveXObject('htmlfile');
htmlfile.write('<meta http-equiv="x-ua-compatible" content="IE=11" />');
try {
    var js = new ActiveXObject('Scripting.FileSystemObject').OpenTextFile('app_v2.js', 1).ReadAll();
    htmlfile.parentWindow.execScript(js);
    WScript.Echo('Syntax OK');
} catch(e) {
    WScript.Echo('Error: ' + e.message);
}
