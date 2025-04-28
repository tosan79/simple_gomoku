const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, 'program-metadata.json');

// Initialize metadata file if it doesn't exist
if (!fs.existsSync(metadataPath)) {
    fs.writeFileSync(metadataPath, JSON.stringify({}));
}

function getProgramMetadata() {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
}

function saveProgramMetadata(metadata) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

function addProgramMetadata(programName, room) {
    const metadata = getProgramMetadata();
    metadata[programName] = { room };
    saveProgramMetadata(metadata);
}

function removeProgramMetadata(programName) {
    const metadata = getProgramMetadata();
    delete metadata[programName];
    saveProgramMetadata(metadata);
}

function getProgramRoom(programName) {
    const metadata = getProgramMetadata();
    return metadata[programName]?.room || null;
}

module.exports = {
    addProgramMetadata,
    removeProgramMetadata,
    getProgramRoom
};