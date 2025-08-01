document.addEventListener('DOMContentLoaded', () => {

  const CONSTANTS = {
    MEMORY_SIZE: 256,
    VECTOR_REG_COUNT: 1, 
    VECTOR_REG_SIZE: 4,
    INFINITE_LOOP_THRESHOLD: 10000,
    I_CACHE_SIZE: 8,
    D_CACHE_SIZE: 16,
    INSTRUCTION_MAP: {
      "NOP": 0, "STA": 16, "LDA": 32, "ADD": 48,
      "OR": 64, "AND": 80, "NOT": 96, "JMP": 128,
      "JN": 144, "JZ": 160, "HLT": 240,
      
      "VLD": 241, "VST": 242, "VADD": 243, "VEADD": 244,
      "VOR": 245, "VAND": 246, "VNOT": 247
    },
    OPERAND_INSTRUCTIONS: ["STA", "LDA", "ADD", "OR", "AND", "JMP", "JN", "JZ", "VLD", "VST", "VADD", "VOR", "VAND"],
    VECTOR_INSTRUCTIONS: ["VLD", "VST", "VADD", "VEADD", "VOR", "VAND", "VNOT"],
    SIMPLE_INSTRUCTIONS: ["NOP", "HLT", "NOT", "VEADD", "VNOT"]
  };
  CONSTANTS.REVERSE_INSTRUCTION_MAP = Object.fromEntries(
    Object.entries(CONSTANTS.INSTRUCTION_MAP).map(([k, v]) => [v, k])
  );

  const state = {
    memory: new Array(CONSTANTS.MEMORY_SIZE).fill(0),
    opcodeMap: new Array(CONSTANTS.MEMORY_SIZE).fill(null),
    pc: 0,
    ac: 0,
    vac: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0),
    zeroFlag: true,
    negativeFlag: false,
    isStepMode: false,
    displayBase: 10,
    leftInputBase: 10,
    currentLanguage: (navigator.language.toLowerCase().startsWith('pt')) ? 'pt' : 'en',
    iCache: { tag: -1, valid: false, data: new Array(CONSTANTS.I_CACHE_SIZE).fill(0), hits: 0, misses: 0 },
    dCache: { tag: -1, valid: false, data: new Array(CONSTANTS.D_CACHE_SIZE).fill(0), hits: 0, misses: 0 }
  };

  const ui = {
    inputLeft: document.getElementById('input-left'),
    outputLeft: document.getElementById('output-left'),
    highlightingArea: document.getElementById('highlighting-area'),
    highlightingCode: document.querySelector('#highlighting-area code'),
    memoryGrid: document.getElementById('memory-grid-container'),
    acValue: document.getElementById('ac-value'),
    pcValue: document.getElementById('pc-value'),
    vacValue: document.getElementById('vac-value'),
    baseDisplay: document.getElementById('base-display'),
    nFlagBox: document.getElementById('n-flag-box'),
    zFlagBox: document.getElementById('z-flag-box'),
    logContainer: document.getElementById('log-container'),
    stepControls: document.getElementById('step-controls'),
    aboutModal: document.getElementById('about-modal'),
    helpModal: document.getElementById('help-modal'),
    overlay: document.getElementById('overlay'),
    languageSwitch: document.getElementById('language-switch'),
    btnRunProg: document.getElementById('btnRunProg'),
    btnStep: document.getElementById('btnStep'),
    btnClear: document.getElementById('btnClear'),
    btnNext: document.getElementById('btnNext'),
    btnStopStep: document.getElementById('btnStopStep'),
    btnHex: document.getElementById('btnHex'),
    btnDec: document.getElementById('btnDec'),
    btnCloseAbout: document.getElementById('close-about'),
    btnCloseHelp: document.getElementById('close-help'),
    btnAbout: document.getElementById('about-btn'),
    btnHelp: document.getElementById('help-btn'),
    btnLoad: document.querySelector('#file .dropdown button:nth-child(1)'),
    btnSave: document.querySelector('#file .dropdown button:nth-child(2)'),
    fileMenu: document.getElementById('file'),
    viewMenu: document.getElementById('view'),
    runMenu: document.getElementById('run'),
    icacheHits: document.getElementById('icache-hits'),
    icacheMisses: document.getElementById('icache-misses'),
    icacheTag: document.getElementById('icache-tag'),
    icacheData: document.getElementById('icache-data'),
    dcacheHits: document.getElementById('dcache-hits'),
    dcacheMisses: document.getElementById('dcache-misses'),
    dcacheTag: document.getElementById('dcache-tag'),
    dcacheData: document.getElementById('dcache-data'),
    helpTitle: document.getElementById('help-title'),
    helpContent: document.getElementById('help-content'),
  };

  const languageStrings = {
    en: {
        '#file .menu-label': 'File',
        '#view .menu-label': 'View',
        '#run .menu-label': 'Run',
        '#about-btn': 'About',
        '#help-btn': 'Help',
        '#language-switch': 'PT',
        '#btnRunProg': 'Run Program',
        '#btnStep': 'Step-by-Step',
        '#btnClear': 'Clear',
        '#btnLoad': 'Load',
        '#btnSave': 'Save',
        log: {
            executing: 'Executing: {0} {1} @{2}',
            halted: 'Program halted.',
            init: 'NeanderWeb-V Simulator initialized.',
            cleared: 'Simulator cleared.',
            errorPcOutOfBounds: 'Error: Program Counter out of bounds.',
            errorInvalidOpcode: 'Error: Invalid opcode {0} at address {1}.',
            errorInfiniteLoop: 'Error: Infinite loop detected.',
            iCacheHit: 'I-Cache HIT for address {0}',
            iCacheMiss: 'I-Cache MISS for address {0}',
            dCacheHit: 'D-Cache HIT for address {0}',
            dCacheMiss: 'D-Cache MISS for address {0}',
            dCacheWrite: 'D-Cache WRITE on address {0} with value {1}'
        },
        help: {
            title: 'Instruction Set',
            headers: ['Instruction (Opcode)', 'Description', 'Example'],
            instructions: [
                { name: 'NOP', op: 0, desc: 'No operation. Does nothing.', example: 'NOP' },
                { name: 'STA', op: 16, desc: 'Stores the content of AC at memory address.', example: 'STA 40' },
                { name: 'LDA', op: 32, desc: 'Loads the value from the memory address into AC.', example: 'LDA 41' },
                { name: 'ADD', op: 48, desc: 'Adds the value from the memory address to AC.', example: 'ADD 42' },
                { name: 'OR', op: 64, desc: 'Performs a logical OR between AC and the content of the memory address.', example: 'OR 43' },
                { name: 'AND', op: 80, desc: 'Performs a logical AND between AC and the content of the memory address.', example: 'AND 44' },
                { name: 'NOT', op: 96, desc: 'Inverts all bits of AC.', example: 'NOT' },
                { name: 'JMP', op: 128, desc: 'Jumps unconditionally to the memory address.', example: 'JMP 45' },
                { name: 'JN', op: 144, desc: 'Jumps to the memory address if the sign flag (N) is set.', example: 'JN 46' },
                { name: 'JZ', op: 160, desc: 'Jumps to the memory address if the zero flag (Z) is set.', example: 'JZ 47' },
                { name: 'HLT', op: 240, desc: 'Halts the program execution.', example: 'HLT' },
                { name: 'VLD', op: 241, desc: 'Loads a vector from memory (starting at address) into the VAC register.', example: 'VLD 50' },
                { name: 'VST', op: 242, desc: 'Stores the vector from VAC into memory (starting at address).', example: 'VST 54' },
                { name: 'VADD', op: 243, desc: 'Adds, element by element, VAC with the vector stored at memory address.', example: 'VADD 51' },
                { name: 'VEADD', op: 244, desc: 'Adds the scalar value of AC to all elements of VAC.', example: 'VEADD' },
                { name: 'VOR', op: 245, desc: 'Performs a logical OR, element by element, between VAC and the vector from memory.', example: 'VOR 52' },
                { name: 'VAND', op: 246, desc: 'Performs a logical AND, element by element, between VAC and the vector from memory.', example: 'VAND 53' },
                { name: 'VNOT', op: 247, desc: 'Inverts bit by bit each element of the VAC vector.', example: 'VNOT' }
            ]
        }
    },
    pt: {
        '#file .menu-label': 'Arquivo',
        '#view .menu-label': 'Visualizar',
        '#run .menu-label': 'Rodar',
        '#about-btn': 'Sobre',
        '#help-btn': 'Ajuda',
        '#language-switch': 'EN',
        '#btnRunProg': 'Rodar Programa',
        '#btnStep': 'Passo a Passo',
        '#btnClear': 'Limpar',
        '#btnLoad': 'Carregar',
        '#btnSave': 'Salvar',
        log: {
            executing: 'Executando: {0} {1} @{2}',
            halted: 'Programa finalizado.',
            init: 'Simulador NeanderWeb-V inicializado.',
            cleared: 'Simulador reiniciado.',
            errorPcOutOfBounds: 'Erro: Contador de Programa fora dos limites.',
            errorInvalidOpcode: 'Erro: Opcode inválido {0} no endereço {1}.',
            errorInfiniteLoop: 'Erro: Loop infinito detectado.',
            iCacheHit: 'I-Cache HIT para o endereço {0}',
            iCacheMiss: 'I-Cache MISS para o endereço {0}',
            dCacheHit: 'D-Cache HIT para o endereço {0}',
            dCacheMiss: 'D-Cache MISS para o endereço {0}',
            dCacheWrite: 'D-Cache ESCRITA no endereço {0} com valor {1}'
        },
        help: {
            title: 'Conjunto de Instruções',
            headers: ['Instrução (Opcode)', 'Descrição', 'Exemplo'],
            instructions: [
                { name: 'NOP', op: 0, desc: 'Nenhuma operação. Não faz nada.', example: 'NOP' },
                { name: 'STA', op: 16, desc: 'Armazena o conteúdo de AC no endereço de memória.', example: 'STA 40' },
                { name: 'LDA', op: 32, desc: 'Carrega o valor do endereço de memória para AC.', example: 'LDA 41' },
                { name: 'ADD', op: 48, desc: 'Soma o valor do endereço de memória ao AC.', example: 'ADD 42' },
                { name: 'OR', op: 64, desc: 'Realiza OU lógico entre AC e o conteúdo do endereço de memória.', example: 'OR 43' },
                { name: 'AND', op: 80, desc: 'Realiza E lógico entre AC e o conteúdo do endereço de memória.', example: 'AND 44' },
                { name: 'NOT', op: 96, desc: 'Inverte todos os bits de AC.', example: 'NOT' },
                { name: 'JMP', op: 128, desc: 'Salta incondicionalmente para o endereço de memória.', example: 'JMP 45' },
                { name: 'JN', op: 144, desc: 'Salta para o endereço se a flag de sinal (N) estiver ativada.', example: 'JN 46' },
                { name: 'JZ', op: 160, desc: 'Salta para o endereço se a flag de zero (Z) estiver ativada.', example: 'JZ 47' },
                { name: 'HLT', op: 240, desc: 'Interrompe a execução do programa.', example: 'HLT' },
                { name: 'VLD', op: 241, desc: 'Carrega vetor da memória (a partir do endereço) para o registrador VAC.', example: 'VLD 50' },
                { name: 'VST', op: 242, desc: 'Armazena o vetor de VAC na memória (a partir do endereço).', example: 'VST 54' },
                { name: 'VADD', op: 243, desc: 'Soma, elemento a elemento, VAC com o vetor armazenado no endereço.', example: 'VADD 51' },
                { name: 'VEADD', op: 244, desc: 'Soma o valor escalar do AC a todos os elementos de VAC.', example: 'VEADD' },
                { name: 'VOR', op: 245, desc: 'Realiza OU lógico, elemento a elemento, entre VAC e o vetor da memória.', example: 'VOR 52' },
                { name: 'VAND', op: 246, desc: 'Realiza E lógico, elemento a elemento, entre VAC e o vetor da memória.', example: 'VAND 53' },
                { name: 'VNOT', op: 247, desc: 'Inverte bit a bit cada elemento do vetor VAC.', example: 'VNOT' }
            ]
        }
    }
  };

  function populateHelpModal() {
    const lang = state.currentLanguage;
    const helpData = languageStrings[lang].help;

    ui.helpTitle.textContent = helpData.title;
    
    let tableHTML = '<table><thead><tr>';
    helpData.headers.forEach(header => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    helpData.instructions.forEach(instr => {
      let instrClass = '';
      if (CONSTANTS.VECTOR_INSTRUCTIONS.includes(instr.name)) {
        instrClass = 'instr-vector';
      } else if (CONSTANTS.SIMPLE_INSTRUCTIONS.includes(instr.name)) {
        instrClass = 'instr-simple';
      } else if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(instr.name)) {
        instrClass = 'instr-operand';
      }
      
      tableHTML += `
        <tr>
          <td><code class="${instrClass}">${instr.name}</code> (${instr.op})</td>
          <td>${instr.desc}</td>
          <td><code>${instr.example}</code></td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    ui.helpContent.innerHTML = tableHTML;
  }

  function updateLanguage() {
    const lang = state.currentLanguage;
    const strings = languageStrings[lang];

    ui.fileMenu.firstChild.textContent = strings['#file .menu-label'];
    ui.viewMenu.firstChild.textContent = strings['#view .menu-label'];
    ui.runMenu.firstChild.textContent = strings['#run .menu-label'];
    
    document.querySelector('#about-btn').textContent = strings['#about-btn'];
    document.querySelector('#help-btn').textContent = strings['#help-btn'];
    ui.languageSwitch.textContent = strings['#language-switch'];
    ui.btnRunProg.textContent = strings['#btnRunProg'];
    ui.btnStep.textContent = strings['#btnStep'];
    ui.btnClear.textContent = strings['#btnClear'];
    ui.btnLoad.textContent = strings['#btnLoad'];
    ui.btnSave.textContent = strings['#btnSave'];

    populateHelpModal();
  }

  function highlightSyntax(text) {
      const boundChar = '\n'; 
      let highlightedText = text + boundChar;

      highlightedText = highlightedText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      const allVectorInstructions = CONSTANTS.VECTOR_INSTRUCTIONS.join('|');
      const vectorRegex = new RegExp(`\\b(${allVectorInstructions})\\b`, 'gi');

      highlightedText = highlightedText.replace(/\b(NOP|HLT|NOT|VEADD|VNOT)\b/gi, '<span class="instr-simple">$&</span>');
      highlightedText = highlightedText.replace(/\b(STA|LDA|ADD|OR|AND|JMP|JN|JZ|VLD|VST|VADD|VOR|VAND)\b/gi, '<span class="instr-operand">$&</span>');
      highlightedText = highlightedText.replace(vectorRegex, '<span class="instr-vector">$&</span>');
      highlightedText = highlightedText.replace(/;.*/g, '<span class="comment">$&</span>');
      
      ui.highlightingCode.innerHTML = highlightedText;
  }

  function highlightMemory() {
    for (let i = 0; i < CONSTANTS.MEMORY_SIZE; i++) {
        const addrCell = document.getElementById(`mem-addr-${i}`);
        const valueCell = document.getElementById(`mem-value-${i}`);

        if (addrCell && valueCell) {
            addrCell.textContent = i.toString(state.displayBase).toUpperCase();
            valueCell.textContent = formatNumber(state.memory[i]);

            const opcodeType = state.opcodeMap[i];
            valueCell.className = 'memory-cell-value';
            if (opcodeType === 'simple') {
                valueCell.classList.add('instr-simple');
            } else if (opcodeType === 'operand') {
                valueCell.classList.add('instr-operand');
            } else if (opcodeType === 'vector') {
                valueCell.classList.add('instr-vector');
            }
        }
    }
  }
  
  function calculateInstructionSize(line) {
    const code = line.split(';')[0].trim();
    if (!code) return 1;

    const parts = code.split(/[\s,]+/);
    const op = parts[0].toUpperCase();

    if (CONSTANTS.INSTRUCTION_MAP.hasOwnProperty(op)) {
        if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(op) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(op)) {
            return 2;
        }
    }
    return 1;
  }

  function handleEditorInput() {
    const originalText = ui.inputLeft.value;
    const lines = originalText.split('\n');
    let memPtr = 0;
    let lastGoodLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const instructionSize = calculateInstructionSize(lines[i]);
        if (memPtr + instructionSize > CONSTANTS.MEMORY_SIZE) {
            break;
        }
        memPtr += instructionSize;
        lastGoodLineIndex = i;
    }
    
    let textToProcess = originalText;
    if (lastGoodLineIndex + 1 < lines.length) {
        const start = ui.inputLeft.selectionStart;
        
        const truncatedLines = lines.slice(0, lastGoodLineIndex + 1);
        const newText = truncatedLines.join('\n');
        
        ui.inputLeft.value = newText;
        textToProcess = newText;

        const newCursorPos = Math.min(start, newText.length);
        ui.inputLeft.setSelectionRange(newCursorPos, newCursorPos);
    }
    
    highlightSyntax(textToProcess);
    handleLeftInputChange();
  }

  const formatNumber = (num) => (state.displayBase === 10 ? String(num) : num.toString(16).toUpperCase());
  
  function log(message) {
    ui.logContainer.innerHTML += message + '<br>';
    ui.logContainer.scrollTop = ui.logContainer.scrollHeight;
  }
  
  function logMessage(key, ...args) {
    const messageTemplate = languageStrings[state.currentLanguage]?.log?.[key];
    if (!messageTemplate) {
        log(key);
        return;
    }
    let formattedMessage = messageTemplate;
    for (let i = 0; i < args.length; i++) {
        const formattedArg = (typeof args[i] === 'number') ? formatNumber(args[i]) : args[i];
        formattedMessage = formattedMessage.replace(`{${i}}`, formattedArg);
    }
    log(formattedMessage);
  }

  const clearLog = () => ui.logContainer.innerHTML = '';

  function updateAcUI() {
    state.ac &= 0xFF; 
    state.zeroFlag = (state.ac === 0);
    state.negativeFlag = ((state.ac & 0x80) !== 0);

    ui.acValue.textContent = formatNumber(state.ac);
    
    ui.nFlagBox.classList.toggle('active', state.negativeFlag);
    ui.zFlagBox.classList.toggle('active', state.zeroFlag);
  }

  const updatePcUI = () => ui.pcValue.textContent = formatNumber(state.pc);

  function updateVacUI() {
    const formattedVac = state.vac.map(formatNumber);
    ui.vacValue.textContent = `[${formattedVac.join(', ')}]`;
  }

  function updateBaseUI() {
    ui.baseDisplay.textContent = state.displayBase === 10 ? 'DEC' : 'HEX';
  }

  function updateCacheUI() {
    ui.icacheHits.textContent = state.iCache.hits;
    ui.icacheMisses.textContent = state.iCache.misses;
    ui.icacheTag.textContent = state.iCache.valid ? formatNumber(state.iCache.tag) : '-';
    ui.icacheData.textContent = state.iCache.valid ? `[${state.iCache.data.map(formatNumber).join(', ')}]` : '[...]';
    
    ui.dcacheHits.textContent = state.dCache.hits;
    ui.dcacheMisses.textContent = state.dCache.misses;
    ui.dcacheTag.textContent = state.dCache.valid ? formatNumber(state.dCache.tag) : '-';
    ui.dcacheData.textContent = state.dCache.valid ? `[${state.dCache.data.map(formatNumber).join(', ')}]` : '[...]';
  }

  function updateLeftLineCounter() {
    const lines = ui.inputLeft.value.split('\n');
    const memPos = [];
    let addr = 0;
    for (const line of lines) {
      if (addr >= CONSTANTS.MEMORY_SIZE) {
          memPos.push('...');
      } else {
          memPos.push(formatNumber(addr));
      }
      addr += calculateInstructionSize(line);
    }
    ui.outputLeft.innerHTML = memPos.join('<br>');
  }

  function assembleCode() {
    const lines = ui.inputLeft.value.split('\n');
    state.memory.fill(0);
    state.opcodeMap.fill(null);
    let memPtr = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (memPtr >= CONSTANTS.MEMORY_SIZE) break;

        const raw = line.split(';')[0].trim();
        if (!raw) {
            state.memory[memPtr++] = 0;
            continue;
        }
      
        const tokens = raw.split(/[\s,]+/);
        const op = tokens[0].toUpperCase();

        if (CONSTANTS.INSTRUCTION_MAP.hasOwnProperty(op)) {
            const isOperand = CONSTANTS.OPERAND_INSTRUCTIONS.includes(op) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(op);
            if (isOperand && memPtr + 2 > CONSTANTS.MEMORY_SIZE) break;

            state.memory[memPtr] = CONSTANTS.INSTRUCTION_MAP[op];
            
            if (CONSTANTS.SIMPLE_INSTRUCTIONS.includes(op)) {
                state.opcodeMap[memPtr] = 'simple';
            } else if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(op)) {
                state.opcodeMap[memPtr] = 'operand';
            }
            if (CONSTANTS.VECTOR_INSTRUCTIONS.includes(op)) {
                state.opcodeMap[memPtr] = 'vector';
            }
            memPtr++;

            if (isOperand) {
                if (tokens.length > 1 && tokens[1]) {
                    const operand = parseInt(tokens[1], state.leftInputBase);
                    state.memory[memPtr++] = isNaN(operand) ? 0 : (operand & 0xFF);
                } else {
                    memPtr++;
                }
            }
        } else {
            const data = parseInt(raw, state.leftInputBase);
            state.memory[memPtr++] = isNaN(data) ? 0 : (data & 0xFF);
        }
    }

    highlightMemory();
  }
  
  function accessCache(address, cache, cacheSize, logPrefix) {
      const blockOffset = address % cacheSize;
      const blockStartAddr = address - blockOffset;
      const tag = blockStartAddr;

      if (cache.valid && cache.tag === tag) {
          cache.hits++;
          logMessage(`${logPrefix}CacheHit`, address);
          return cache.data[blockOffset];
      } else {
          cache.misses++;
          logMessage(`${logPrefix}CacheMiss`, address);
          for (let i = 0; i < cacheSize; i++) {
              if (blockStartAddr + i < CONSTANTS.MEMORY_SIZE) {
                cache.data[i] = state.memory[blockStartAddr + i] || 0;
              }
          }
          cache.tag = tag;
          cache.valid = true;
          return cache.data[blockOffset];
      }
  }

  const accessICache = (address) => accessCache(address, state.iCache, CONSTANTS.I_CACHE_SIZE, 'i');
  
  function accessDCache(address, valueToWrite = null) {
      const cache = state.dCache;
      const cacheSize = CONSTANTS.D_CACHE_SIZE;
      const blockOffset = address % cacheSize;
      const blockStartAddr = address - blockOffset;
      const tag = blockStartAddr;

      if (valueToWrite !== null) {
          logMessage('dCacheWrite', address, valueToWrite);
          state.memory[address] = valueToWrite;
          if (cache.valid && cache.tag === tag) {
              cache.data[blockOffset] = valueToWrite;
          }
          return;
      }
      
      return accessCache(address, cache, cacheSize, 'd');
  }
  
  function executeSingleInstruction() {
      if (state.pc < 0 || state.pc >= CONSTANTS.MEMORY_SIZE) {
        logMessage('errorPcOutOfBounds');
        return 'HALT';
      }
      
      const opcode = accessICache(state.pc);
      const instr = CONSTANTS.REVERSE_INSTRUCTION_MAP[opcode];
      
      if (!instr) {
        logMessage('errorInvalidOpcode', opcode, state.pc);
        return 'HALT';
      }
      
      let arg = 0;
      if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(instr) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(instr)) {
          if (state.pc + 1 < CONSTANTS.MEMORY_SIZE) {
            arg = accessICache(state.pc + 1);
          }
      }

      const argText = CONSTANTS.OPERAND_INSTRUCTIONS.includes(instr) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(instr) ? formatNumber(arg) : '';
      logMessage('executing', instr, argText, formatNumber(state.pc));

      switch (instr) {
        case 'NOP': state.pc++; break;
        case 'STA': accessDCache(arg, state.ac); state.opcodeMap[arg] = null; state.pc += 2; break;
        case 'LDA': state.ac = accessDCache(arg); state.pc += 2; break;
        case 'ADD': state.ac += accessDCache(arg); state.pc += 2; break;
        case 'OR':  state.ac |= accessDCache(arg); state.pc += 2; break;
        case 'AND': state.ac &= accessDCache(arg); state.pc += 2; break;
        case 'NOT': state.ac = ~state.ac; state.pc++; break;
        case 'JMP': state.pc = arg; break;
        case 'JN': state.pc = state.negativeFlag ? arg : state.pc + 2; break;
        case 'JZ': state.pc = state.zeroFlag ? arg : state.pc + 2; break;
        case 'HLT': logMessage('halted'); return 'HALT';

        case 'VLD': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < CONSTANTS.MEMORY_SIZE) state.vac[i] = accessDCache(address + i);
            }
            state.pc += 2;
            break;
        }
        case 'VST': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < CONSTANTS.MEMORY_SIZE) {
                    accessDCache(address + i, state.vac[i]);
                    state.opcodeMap[address + i] = null;
                }
            }
            state.pc += 2;
            break;
        }
        case 'VADD': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < CONSTANTS.MEMORY_SIZE) state.vac[i] = (state.vac[i] + accessDCache(address + i)) & 0xFF;
            }
            state.pc += 2;
            break;
        }
        case 'VEADD': {
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                state.vac[i] = (state.vac[i] + state.ac) & 0xFF;
            }
            state.pc++;
            break;
        }
        case 'VOR': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < CONSTANTS.MEMORY_SIZE) state.vac[i] = (state.vac[i] | accessDCache(address + i)) & 0xFF;
            }
            state.pc += 2;
            break;
        }
        case 'VAND': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < CONSTANTS.MEMORY_SIZE) state.vac[i] = (state.vac[i] & accessDCache(address + i)) & 0xFF;
            }
            state.pc += 2;
            break;
        }
        case 'VNOT': {
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                state.vac[i] = (~state.vac[i]) & 0xFF;
            }
            state.pc++;
            break;
        }
      }
      
      updateAcUI();
      updatePcUI();
      updateVacUI();
      updateCacheUI();
      return 'CONTINUE';
  }

  function resetState() {
      state.ac = 0;
      state.pc = 0;
      state.vac = new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0);
      
      state.iCache = { tag: -1, valid: false, data: new Array(CONSTANTS.I_CACHE_SIZE).fill(0), hits: 0, misses: 0 };
      state.dCache = { tag: -1, valid: false, data: new Array(CONSTANTS.D_CACHE_SIZE).fill(0), hits: 0, misses: 0 };

      updateAcUI();
      updatePcUI();
      updateVacUI();
      updateCacheUI();
      updateBaseUI();
  }

  function clearSimulator() {
    clearLog();
    resetState();
    logMessage('cleared');
    updateLeftLineCounter();
    assembleCode();
  }

  function runProgram() {
    clearLog();
    assembleCode();
    resetState();

    let steps = 0;
    while (steps < CONSTANTS.INFINITE_LOOP_THRESHOLD) {
      if (executeSingleInstruction() === 'HALT') {
        break;
      }
      steps++;
    }

    if (steps >= CONSTANTS.INFINITE_LOOP_THRESHOLD) {
      logMessage('errorInfiniteLoop');
    }

    highlightMemory();
  }
  
  function initStepMode() {
    clearLog();
    assembleCode();
    resetState();
    state.isStepMode = true;
    ui.stepControls.style.display = 'flex';
  }

  function executeStep() {
    if (!state.isStepMode) initStepMode();
    
    if (executeSingleInstruction() === 'HALT') {
      state.isStepMode = false;
    }
    
    highlightMemory();
  }

  function stopStepMode() {
    state.isStepMode = false;
    ui.stepControls.style.display = 'none';
  }

  function handleLeftInputChange() {
    updateLeftLineCounter();
    assembleCode();
  }
  
  function convertLeftEditor(newBase) {
    const text = ui.inputLeft.value;
    const newLines = text.split('\n').map(line => {
      const commentPart = line.includes(';') ? ' ;' + line.split(';')[1] : '';
      const code = line.split(';')[0].trim();
      if (!code) return line;

      const tokens = code.split(/[\s,]+/);
      const op = tokens[0].toUpperCase();

      if ([...CONSTANTS.OPERAND_INSTRUCTIONS, ...CONSTANTS.SIMPLE_INSTRUCTIONS].includes(op)) {
          if (tokens.length > 1) {
              const val = parseInt(tokens[1], state.leftInputBase);
              if (!isNaN(val)) tokens[1] = (newBase === 10) ? String(val) : val.toString(16).toUpperCase();
          }
          return tokens.join(' ') + commentPart;
      } else {
        const val = parseInt(tokens[0], state.leftInputBase);
        return !isNaN(val) ? ((newBase === 10) ? String(val) : val.toString(16).toUpperCase()) : line;
      }
    });
    
    state.leftInputBase = newBase;
    state.displayBase = newBase;
    
    ui.inputLeft.value = newLines.join('\n');
    highlightSyntax(ui.inputLeft.value);
    
    updateAcUI();
    updatePcUI();
    updateVacUI();
    updateCacheUI();
    updateBaseUI();
    updateLeftLineCounter();
    highlightMemory();
  }

  function loadFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.mem';
    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        let content = ev.target.result;
        const firstLine = content.split('\n')[0].trim().toUpperCase();
        
        let newBase = state.leftInputBase;
        
        if (firstLine === '#HEX') {
          newBase = 16;
          content = content.substring(content.indexOf('\n') + 1);
        } else if (firstLine === '#DEC') {
          newBase = 10;
          content = content.substring(content.indexOf('\n') + 1);
        }

        state.leftInputBase = newBase;
        state.displayBase = newBase;
        
        ui.inputLeft.value = content;
        
        handleEditorInput();
        updateAcUI();
        updatePcUI();
        updateVacUI();
        updateCacheUI();
        updateBaseUI();
      };
      reader.readAsText(file);
    };
    fileInput.click();
  }

  function saveFile() {
    const metadata = `#${state.leftInputBase === 10 ? 'DEC' : 'HEX'}\n`;
    const textToSave = metadata + ui.inputLeft.value;
    
    const blob = new Blob([textToSave], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'program.mem';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const toggleModal = (modalElement, show) => {
      modalElement.style.display = show ? 'block' : 'none';
      ui.overlay.style.display = show ? 'block' : 'none';
  };
  
  function createMemoryGrid() {
    for (let i = 0; i < CONSTANTS.MEMORY_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'memory-cell';
        cell.id = `mem-cell-${i}`;

        const addr = document.createElement('div');
        addr.className = 'memory-cell-addr';
        addr.id = `mem-addr-${i}`;

        const value = document.createElement('div');
        value.className = 'memory-cell-value';
        value.id = `mem-value-${i}`;
        
        cell.appendChild(addr);
        cell.appendChild(value);
        ui.memoryGrid.appendChild(cell);
    }
  }

  function bindEventListeners() {
    ui.btnLoad.addEventListener('click', loadFile);
    ui.btnSave.addEventListener('click', saveFile);
    ui.btnHex.addEventListener('click', () => convertLeftEditor(16));
    ui.btnDec.addEventListener('click', () => convertLeftEditor(10));
    ui.btnRunProg.addEventListener('click', runProgram);
    ui.btnStep.addEventListener('click', initStepMode);
    ui.btnClear.addEventListener('click', clearSimulator);
    
    ui.btnAbout.addEventListener('click', () => toggleModal(ui.aboutModal, true));
    ui.btnCloseAbout.addEventListener('click', () => toggleModal(ui.aboutModal, false));
    
    ui.btnHelp.addEventListener('click', () => toggleModal(ui.helpModal, true));
    ui.btnCloseHelp.addEventListener('click', () => toggleModal(ui.helpModal, false));

    ui.languageSwitch.addEventListener('click', () => {
      state.currentLanguage = state.currentLanguage === 'en' ? 'pt' : 'en';
      updateLanguage();
    });

    ui.inputLeft.addEventListener('input', handleEditorInput);
    
    ui.inputLeft.addEventListener('scroll', () => {
        ui.highlightingArea.scrollTop = ui.inputLeft.scrollTop;
        ui.highlightingArea.scrollLeft = ui.inputLeft.scrollLeft;
        ui.outputLeft.scrollTop = ui.inputLeft.scrollTop;
    });

    ui.btnNext.addEventListener('click', executeStep);
    ui.btnStopStep.addEventListener('click', stopStepMode);

    ui.overlay.addEventListener('click', () => {
        toggleModal(ui.aboutModal, false);
        toggleModal(ui.helpModal, false);
    });
  }
  
  function main() {
    createMemoryGrid();
    bindEventListeners();
    const initialContent = `; Programa
VLD 11 ; Carrega [1, 2, 3, 4] no VAC
LDA 15 ; Carrega 10 no AC
VEADD ; VAC = [11, 12, 13, 14]
VNOT ; Inverte os bits de cada elemento
VST 20 ; Salva o resultado em 20-23
HLT
; Vetor de dados
1
2
3
4
10`;
    ui.inputLeft.value = initialContent;
    handleEditorInput();
    updateLanguage();
    resetState();
    logMessage('init');
  }

function getResolution() {
    return `${window.innerWidth} x ${window.innerHeight}`;
  }
window.getResolution = getResolution;

  main();

});
