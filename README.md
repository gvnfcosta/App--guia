# 🔥 ÁGUIA ENGENHARIA | IHM TERMOCALDEIRA 4.0

<div align="center">

![Status](https://img.shields.io/badge/Status-Concluído-success?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Design](https://img.shields.io/badge/Design-SCADA%20Industrial-orange?style=for-the-badge)
![Licença](https://img.shields.io/badge/Licença-MIT-blue?style=for-the-badge)

**Interface Homem-Máquina (IHM / SCADA 4.0) desenvolvida em Front-end Puro (HTML5 & CSS3) para monitoramento e controle da Termocaldeira 4.0 da Águia Engenharia.**

[Visualizar Demonstração](#-como-executar) • [Especificação da Tela](#-especificação-e-montagem-da-tela) • [Estrutura](#-estrutura-do-projeto) • [Requisitos](#-requisitos-atendidos)

</div>

---

## 📖 Visão Geral

O projeto **IHM Termocaldeira 4.0** é uma interface gráfica industrial desenvolvida em **Front-end puro (HTML5 semântico e CSS3)**, criada do zero sem uso de frameworks ou scripts JavaScript.

A interface replica com fidelidade o painel SCADA/IHM de alta performance para controle térmico, temporal e energético de caldeiras industriais e fornos da **Águia Engenharia**.

---

## 🖥️ Especificação e Montagem da Tela

O layout foi organizado rigorosamente de acordo com os requisitos de projeto:

### 1️⃣ Barra Superior (Header)
- **Logo da Empresa:** Águia Engenharia.
- **Nome do Produto:** Termocaldeira 4.0.
- **Status do Sistema (Indicadores Luminosos):**
  - 🟢 **OPERAÇÃO** (LED Verde ativo)
  - 🔴 **PEAK** (LED Vermelho)
  - 🟡 **SENSOR** (LED Amarelo)
  - 🚨 **FALHA** (LED Vermelho com animação intermitente via CSS puro)
- **Data e Hora:** Display com data e relógio digital formatado.

### 2️⃣ Barra Lateral (Controle Lateral)
- **Controle de Temperatura:** Visualização da temperatura atual (650.0 °C), setpoint (700.0 °C) e seletor de modo (`SLOW`, `NORMAL`, `FAST`, `MANUAL`).
- **Controle de Tempo:** Visualização do tempo atual de patamar (08:45 min), setpoint (15:00 min) e seletor de modo (`SLOW`, `NORMAL`, `FAST`, `MANUAL`).
- **Controle de Energia:** Visualização da energia/potência atual (74.5 %), setpoint (80.0 %) e seletor de modo (`SLOW`, `NORMAL`, `FAST`, `MANUAL`).
- **Presets Rápidos:** Biscoito (980°C), Faiança (1050°C), Grés (1220°C), Porcelana (1280°C).

### 3️⃣ Painel Central
- **Displays Digitais em Destaque:** 
  - Temperatura da Caldeira com medidor gráfico e rampa (°C/min).
  - Tempo de Processo com contagem e tempo total decorrido.
  - Energia & Potência com consumo acumulado (kWh).
- **Câmara de Queima / Caldeira (Visualizador):** Simulação de incandescência térmica e convecção em CSS com resistências elétricas ativas e exaustão.

### 4️⃣ Botões de Controle
Botoeiras industriais completas com LEDs de sinalização:
- 🟢 **INICIAR** (com LED verde)
- 🔴 **PARAR**
- 🚨 **E-STOP (Parada de Emergência):** Botão cogumelo de segurança com animação pulsante intermitente em CSS.
- 🟡 **PAUSAR** (com LED âmbar)
- 🔵 **RETOMAR** (com LED azul)
- 🔄 **RESET**
- 🚪 **SAIR**

### 5️⃣ Gráfico e Telemetria (Coluna Direita)
- **Curva Térmica da Queima:** Gráfico vetorial responsivo desenhado em SVG puro comparando o Setpoint Teórico com a Temperatura Real e preenchimento de gradiente térmico.
- **Log de Eventos & Telemetria:** Terminal SCADA em tempo real com registros operacionais, timestamps e status de comunicação MODBUS.

### 6️⃣ Barra Inferior (Footer)
- **Controle de Velocidade:**
  - `SLOW (50%)`
  - `NORMAL (100%)` (Ativo)
  - `FAST (150%)`
- **Informações de Segurança:** Intertravamento térmico a 1350°C e protocolo de automação.

---

## 📁 Estrutura do Projeto

```text
App Águia/
├── IHM/
│   ├── index.html        # Estrutura HTML5 semântica completa
│   ├── style.css         # Design System SCADA com CSS3 puro (sem dependências)
│   └── _instruções.txt   # Requisitos e especificações do projeto
└── README.md             # Documentação oficial do repositório
```

---

## 🚀 Como Executar

Por ser um projeto puramente de **Front-end estático (HTML5 e CSS3)**, basta abrir o arquivo no navegador:

1. Clone o repositório:
   ```bash
   git clone https://github.com/gvnfcosta/App--guia.git
   ```
2. Abra o arquivo `IHM/index.html` em qualquer navegador web moderno (Chrome, Edge, Firefox, Safari, Brave).

---

## 📋 Tabela de Requisitos Atendidos

| Item do Desafio | Descrição | Status |
| :--- | :--- | :---: |
| **1. Barra Superior** | Logo Águia Engenharia, Termocaldeira 4.0, Status (Operação, Peak, Sensor, Falha intermitente), Data e Hora | ✅ |
| **2. Painel Central** | Visualização e Setpoints de Temperatura, Tempo e Energia com modos SLOW, NORMAL, FAST, MANUAL | ✅ |
| **3. Barra Lateral** | Controles dedicados de Temperatura, Tempo e Energia | ✅ |
| **4. Botões de Controle** | INICIAR, PARAR, E-STOP (intermitente), PAUSAR, RETOMAR, RESET, SAIR | ✅ |
| **5. Barra Inferior** | Controle de Velocidade: SLOW (50%), NORMAL (100%), FAST (150%) | ✅ |
| **6. Front-end Puro** | Interface moderna construída sem frameworks e sem scripts JS | ✅ |

---

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Semântica de interface industrial, formulários e acessibilidade.
- **CSS3:** Variáveis CSS (design tokens), layout responsivo em CSS Grid e Flexbox, animações de brilho térmico e intermitência de alarmes.
- **SVG:** Gráfico vetorial de curva térmica.
- **Google Fonts & FontAwesome:** Tipografias técnicas (*Orbitron*, *Inter*, *JetBrains Mono*) e ícones de instrumentação.

---

## 👨‍💻 Autor

Projeto desenvolvido para o desafio de IHM da **Águia Engenharia**.
