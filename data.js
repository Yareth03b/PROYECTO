/**
 * ARCHIVO DE DATOS TÉCNICOS EDITABLE (data.js)
 * -------------------------------------------------------------------------
 * Aquí puedes modificar en cualquier momento las direcciones IP, VLANs,
 * modelos, servicios de red y descripciones que aparecerán cuando el jurado
 * o los visitantes hagan clic en cada equipo durante la feria de la UNAB.
 */

export const EQUIPMENT_DATA = {
  rack_main: {
    category: "INFRAESTRUCTURA DE TELECOMUNICACIONES",
    title: "Gabinete / Rack Principal de Servidores (42U)",
    description:
      "Aloja los servidores centrales del sistema de geolocalización de buses de la UNAB. Cuenta con unidades de distribución de energía (PDU), ventilación forzada sobre piso falso técnico y organización de cableado estructurado.",
    specs: {
      "Ubicación": "Cuarto de Telecomunicaciones (Zona Izquierda)",
      "Servidores Alojados": "Srv-Web/API, Srv-BaseDatos, Srv-Red (DNS/DHCP)",
      "Estándar": "ANSI/TIA-942 / EIA-310-D",
      "Climatización": "Flujo de aire frío por piso falso técnico",
      "Estado": "Operativo (Online)"
    }
  },

  server_gps: {
    category: "SERVIDOR DE APLICACIÓN Y BD",
    title: "Servidor Central UNAB - Tracking GPS & Base de Datos",
    description:
      "Recibe en tiempo real las coordenadas GPS de las unidades de transporte universitario, procesa si el bus ya salió del paradero o llegó al campus de la UNAB, y envía notificaciones push a la App de los estudiantes.",
    specs: {
      "Hostname": "srv-buses-unab.local",
      "Dirección IP": "192.168.20.10 /24",
      "Servicios Activos": "HTTP/API GPS, PostgreSQL, DNS, DHCP",
      "Sistema Operativo": "Ubuntu Server 24.04 LTS",
      "Conectividad": "Doble enlace Gigabit Ethernet hacia Switch Core"
    }
  },

  patch_panel: {
    category: "CABLEADO ESTRUCTURADO",
    title: "Patch Panel Modular Cat6A (24 Puertos)",
    description:
      "Punto de concentración y terminación del cableado horizontal que viene desde las estaciones de trabajo (PCs de monitoreo e impresora) a través de las canaletas y el piso técnico.",
    specs: {
      "Norma de Ponchado": "T568B - UTP Categoría 6A",
      "Puertos Activos": "P01 (PC Monitoreo 1), P02 (PC Monitoreo 2), P03 (PC Admin), P04 (Impresora)",
      "Frecuencia": "500 MHz (Soporte 10GBASE-T)",
      "Certificación": "ANSI/TIA-568-C.2"
    }
  },

  switch_core: {
    category: "CONMUTACIÓN DE RED (CAPA 2/3)",
    title: "Switch Administrable Gigabit (24 Puertos)",
    description:
      "Conecta los servidores del Rack con las estaciones de monitoreo en la oficina contigua, la impresora en red y el Router/Gateway principal. Permite segmentar el tráfico mediante VLANs.",
    specs: {
      "IP de Gestión": "192.168.20.2 /24",
      "VLANs Configuradas": "VLAN 10 (Servidores), VLAN 20 (Monitoreo), VLAN 30 (Gestión)",
      "Velocidad": "10/100/1000 Mbps Full Duplex",
      "Protocolos": "IEEE 802.1Q, STP, LACP"
    }
  },

  router_gateway: {
    category: "ENRUTAMIENTO Y SALIDA WAN",
    title: "Router / Gateway & Receptor de Datos Móviles GPS",
    description:
      "Gestiona la salida a Internet del área y recibe los paquetes de telemetría enviados por los módulos GPS/4G instalados en los buses de la UNAB para entregarlos al servidor interno.",
    specs: {
      "IP Gateway LAN": "192.168.20.1 /24",
      "Enlace WAN": "200.48.225.14 /30 (Fibra Óptica UNAB)",
      "Seguridad / NAT": "Port Forwarding UDP 5055 hacia 192.168.20.10",
      "Protocolos": "OSPF / NAT / Firewall Stateful"
    }
  },

  ups_power: {
    category: "RESPALDO ELÉCTRICO",
    title: "UPS Online Doble Conversión (3000 VA)",
    description:
      "Garantiza que el servidor de ubicación de buses, el switch y el router continúen funcionando sin interrupciones ante cortes de energía eléctrica en el campus.",
    specs: {
      "Capacidad": "3000 VA / 2700 W (220V)",
      "Autonomía Estimada": "45 minutos a carga media",
      "Protección": "Regulación de voltaje (AVR) y supresión de picos",
      "Baterías": "100% Cargadas"
    }
  },

  ac_unit: {
    category: "CLIMATIZACIÓN DE PRECISIÓN",
    title: "Sistema de Aire Acondicionado del Data Center (EDApower)",
    description:
      "Mantiene la temperatura y humedad controladas dentro del cuarto de telecomunicaciones para evitar el sobrecalentamiento del rack y los equipos de red.",
    specs: {
      "Temperatura Objetivo": "20.0 °C ± 1.0 °C",
      "Humedad Relativa": "46%",
      "Inyección de Aire": "Hacia pasillo frío y piso técnico"
    }
  },

  pc_monitor_1: {
    category: "ESTACIÓN DE MONITOREO 1",
    title: "PC Operador 1 - Mapa de Rutas de Buses en Tiempo Real",
    description:
      "Estación de trabajo conectada por cable UTP Cat6A (mediante canaleta superior) al switch del cuarto de servidores. Visualiza el mapa en vivo con la ubicación de los buses de la UNAB.",
    specs: {
      "Hostname": "PC-MONITOREO-01",
      "Dirección IP": "192.168.20.101",
      "Máscara / Gateway": "255.255.255.0 / 192.168.20.1",
      "Punto de Red": "Faceplate RJ45 - Canaleta Norte #01 (Switch Gi0/3)"
    }
  },

  pc_monitor_2: {
    category: "ESTACIÓN DE MONITOREO 2",
    title: "PC Operador 2 - Control de Salidas y Llegadas UNAB",
    description:
      "Segunda consola de supervisión que monitorea los horarios de salida de los paraderos, tiempos estimados de llegada al campus y alertas para los estudiantes.",
    specs: {
      "Hostname": "PC-MONITOREO-02",
      "Dirección IP": "192.168.20.102",
      "Máscara / Gateway": "255.255.255.0 / 192.168.20.1",
      "Punto de Red": "Faceplate RJ45 - Canaleta Norte #02 (Switch Gi0/4)"
    }
  },

  pc_admin: {
    category: "ESTACIÓN DE ADMINISTRACIÓN",
    title: "PC Administración de Servicios de Red y Despacho",
    description:
      "Estación ubicada en la zona inferior derecha para administración de red (SSH/CLI/Web), monitoreo de servicios (DNS, DHCP, HTTP) y atención de incidencias.",
    specs: {
      "Hostname": "PC-ADMIN-RED",
      "Dirección IP": "192.168.20.103",
      "Máscara / Gateway": "255.255.255.0 / 192.168.20.1",
      "Punto de Red": "Faceplate RJ45 - Canaleta Sur #03 (Switch Gi0/5)"
    }
  },

  printer_net: {
    category: "PERIFÉRICO EN RED",
    title: "Impresora Multifuncional de Red (Reportes de Flota)",
    description:
      "Impresora conectada directamente a la red local mediante cable UTP para imprimir reportes diarios de recorridos, asistencia de buses y bitácoras del servidor.",
    specs: {
      "Dirección IP": "192.168.20.200 (IP Estática)",
      "Protocolo": "TCP/IP Raw Port 9100 / IPP",
      "Punto de Red": "Toma RJ45 Pared Divisoria #04 (Switch Gi0/6)"
    }
  },

  structured_cabling: {
    category: "CABLEADO ESTRUCTURADO Y CANALIZACIÓN",
    title: "Tendidos de Cable UTP Cat6A + Canaletas PVC",
    description:
      "Recorrido físico de los cables de red (color azul) que parten del Rack y Switch en el cuarto de servidores, suben por las bandejas portacables del falso techo y bajan por canaletas verticales hacia las 3 PCs y la impresora.",
    specs: {
      "Medio de Transmisión": "Cobre par trenzado UTP Categoría 6A (Chaqueta Azul LSZH)",
      "Canalización Oficina": "Canaleta superficial de PVC blanca de 60x40 mm",
      "Canalización Techo": "Bandeja tipo escalerilla metálica sobre cielo raso",
      "Longitud Promedio": "12 m - 24 m por punto de red (Cumple < 90m TIA-568)"
    }
  }
};

/**
 * ESTADO INICIAL DEL SIMULADOR INTERACTIVO (ESTILO CISCO PACKET TRACER)
 */
export const NETWORK_SIM_STATE = {
  server: {
    hostname: "srv-buses-unab",
    ip: "192.168.20.10",
    mask: "255.255.255.0",
    gateway: "192.168.20.1",
    services: {
      httpGps: true,
      dhcp: true,
      dns: true,
      postgres: true
    },
    dhcpConfig: {
      poolName: "POOL_TRANSPORTE_UNAB",
      defaultGateway: "192.168.20.1",
      dnsServer: "192.168.20.10",
      startIp: "192.168.20.101",
      subnetMask: "255.255.255.0",
      maxUsers: 50
    },
    dnsRecords: [
      { domain: "gps.unab.edu.pe", type: "A", ip: "192.168.20.10" },
      { domain: "srv-buses-unab.local", type: "A", ip: "192.168.20.10" },
      { domain: "gateway.unab.local", type: "A", ip: "192.168.20.1" },
      { domain: "impresora.unab.local", type: "A", ip: "192.168.20.200" }
    ]
  },
  router: {
    hostname: "RTR-UNAB-TRANSPORTE",
    wanIp: "200.48.225.14",
    wanMask: "255.255.255.252",
    lanIp: "192.168.20.1",
    lanMask: "255.255.255.0",
    wanUp: true,
    lanUp: true,
    natEnabled: true
  },
  switchPorts: [
    { port: "Gi0/1", device: "Router Gateway (RTR-UNAB)", vlan: "VLAN 10 / Trunk", ip: "192.168.20.1", up: true },
    { port: "Gi0/2", device: "Servidor GPS & BD (SRV-UNAB)", vlan: "VLAN 10 (Servidores)", ip: "192.168.20.10", up: true },
    { port: "Gi0/3", device: "PC Operador 1 (PC-MONITOREO-01)", vlan: "VLAN 20 (Monitoreo)", ip: "192.168.20.101", up: true, targetKey: "pc_monitor_1" },
    { port: "Gi0/4", device: "PC Operador 2 (PC-MONITOREO-02)", vlan: "VLAN 20 (Monitoreo)", ip: "192.168.20.102", up: true, targetKey: "pc_monitor_2" },
    { port: "Gi0/5", device: "PC Administración (PC-ADMIN-RED)", vlan: "VLAN 30 (Gestión)", ip: "192.168.20.103", up: true, targetKey: "pc_admin" },
    { port: "Gi0/6", device: "Impresora Epson EcoTank", vlan: "VLAN 20 (Monitoreo)", ip: "192.168.20.200", up: true, targetKey: "printer_net" }
  ],
  pcs: {
    pc_monitor_1: {
      hostname: "PC-MONITOREO-01",
      mode: "DHCP",
      ip: "192.168.20.101",
      mask: "255.255.255.0",
      gateway: "192.168.20.1",
      dns: "192.168.20.10",
      mac: "00:1A:2B:3C:4D:01",
      switchPort: "Gi0/3"
    },
    pc_monitor_2: {
      hostname: "PC-MONITOREO-02",
      mode: "DHCP",
      ip: "192.168.20.102",
      mask: "255.255.255.0",
      gateway: "192.168.20.1",
      dns: "192.168.20.10",
      mac: "00:1A:2B:3C:4D:02",
      switchPort: "Gi0/4"
    },
    pc_admin: {
      hostname: "PC-ADMIN-RED",
      mode: "Static",
      ip: "192.168.20.103",
      mask: "255.255.255.0",
      gateway: "192.168.20.1",
      dns: "192.168.20.10",
      mac: "00:1A:2B:3C:4D:03",
      switchPort: "Gi0/5"
    }
  },
  buses: [
    { id: "BUS-01", plate: "EUA-412", route: "Ruta Norte: Paramonga - Pativilca - Campus UNAB", speed: 48, passengers: 38, capacity: 45, status: "EN RUTA", progress: 0.25 },
    { id: "BUS-02", plate: "EUA-819", route: "Ruta Sur: Supe Pueblo - Puerto Supe - Campus UNAB", speed: 42, passengers: 41, capacity: 45, status: "EN RUTA", progress: 0.62 },
    { id: "BUS-03", plate: "EUB-105", route: "Ruta Centro: Plaza de Armas Barranca - Campus UNAB", speed: 0, passengers: 45, capacity: 45, status: "EN CAMPUS UNAB", progress: 0.95 }
  ],
  printer: {
    ip: "192.168.20.200",
    mask: "255.255.255.0",
    gateway: "192.168.20.1",
    status: "Listo (Online - Puerto TCP 9100)",
    ink: { bk: 92, c: 84, m: 79, y: 88 },
    jobs: [
      { id: 101, doc: "Reporte_Salidas_Mañana_UNAB.pdf", user: "PC-MONITOREO-02", pages: 3, time: "07:45 AM", state: "Completado" },
      { id: 102, doc: "Bitacora_Red_Transporte.pdf", user: "PC-ADMIN-RED", pages: 2, time: "08:10 AM", state: "Completado" }
    ]
  },
  ups: {
    mode: "AC Normal (Doble Conversión)",
    inputVoltage: 220,
    outputVoltage: 220,
    loadPercent: 34,
    batteryPercent: 100
  },
  crac: {
    power: true,
    targetTemp: 20.0,
    currentTemp: 20.2,
    humidity: 46,
    fanSpeed: "Automático (75%)"
  }
};

