const fs = require('fs');
let code = fs.readFileSync('src/components/ClientsView.tsx', 'utf-8');
code = code.replace("import { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';");
fs.writeFileSync('src/components/ClientsView.tsx', code);
