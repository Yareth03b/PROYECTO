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
      "Hostname": "srv-buses-unab.local (Editable)",
      "Dirección IP": "192.168.10.10 /24 (Editable)",
      "Servicios Activos": "API REST GPS, WebSockets, PostgreSQL, DNS/DHCP",
      "Sistema Operativo": "Ubuntu Server / Windows Server (Editable)",
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
      "IP de Gestión": "192.168.10.2 (Editable)",
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
      "IP Gateway LAN": "192.168.10.1 /24 (Editable)",
      "Enlace WAN": "Fibra Óptica Dedicada UNAB + Redundancia LTE",
      "Seguridad / NAT": "Port Forwarding seguro & ACLs hacia Servidor GPS",
      "Protocolos": "OSPF / NAT / Firewall Stateful"
    }
  },

  ups_power: {
    category: "RESPALDO ELÉCTRICO",
    title: "UPS Online Doble Conversión (3000 VA)",
    description:
      "Garantiza que el servidor de ubicación de buses, el switch y el router continúen funcionando sin interrupciones ante cortes de energía eléctrica en el campus.",
    specs: {
      "Capacidad": "3000 VA / 2700 W",
      "Autonomía Estimada": "45 minutos a carga media",
      "Protección": "Regulación de voltaje (AVR) y supresión de picos",
      "Baterías": "100% Cargadas"
    }
  },

  ac_unit: {
    category: "CLIMATIZACIÓN DE PRECISIÓN",
    title: "Sistema de Aire Acondicionado del Data Center",
    description:
      "Mantiene la temperatura y humedad controladas dentro del cuarto de telecomunicaciones para evitar el sobrecalentamiento del rack y los equipos de red.",
    specs: {
      "Temperatura Objetivo": "20 °C ± 1.5 °C",
      "Humedad Relativa": "45% - 50%",
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
      "Dirección IP": "192.168.20.101 (DHCP / Reserva)",
      "Punto de Red": "Faceplate RJ45 - Canaleta Norte #01",
      "Aplicación": "Dashboard Web UNAB Bus Tracker"
    }
  },

  pc_monitor_2: {
    category: "ESTACIÓN DE MONITOREO 2",
    title: "PC Operador 2 - Control de Salidas y Llegadas UNAB",
    description:
      "Segunda consola de supervisión que monitorea los horarios de salida de los paraderos, tiempos estimados de llegada al campus y alertas para los estudiantes.",
    specs: {
      "Hostname": "PC-MONITOREO-02",
      "Dirección IP": "192.168.20.102 (DHCP / Reserva)",
      "Punto de Red": "Faceplate RJ45 - Canaleta Norte #02",
      "Estado de Enlace": "Conectado (1 Gbps Full Duplex)"
    }
  },

  pc_admin: {
    category: "ESTACIÓN DE ADMINISTRACIÓN",
    title: "PC Administración de Servicios de Red y Despacho",
    description:
      "Estación ubicada en la zona inferior derecha para administración de red (SSH/Winbox/Web), monitoreo de servicios (DNS, DHCP, HTTP) y atención de incidencias.",
    specs: {
      "Hostname": "PC-ADMIN-RED",
      "Dirección IP": "192.168.20.103",
      "Punto de Red": "Faceplate RJ45 - Canaleta Sur #03",
      "Herramientas": "Terminal SSH, Monitor SNMP, Panel Admin Buses"
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
      "Punto de Red": "Toma RJ45 Pared Divisoria #04"
    }
  },

  structured_cabling: {
    category: "CABLEADO ESTRUCTURADO Y CANALIZACIÓN",
    title: "Tendidos de Cable UTP Cat6A + Canaletas PVC",
    description:
      "Recorrido físico de los cables de red (color azul) que parten del Rack y Switch en el cuarto de servidores, cruzan ordenadamente el muro divisor mediante pasamuros y se distribuyen por canaletas blancas hacia las 3 PCs y la impresora.",
    specs: {
      "Medio de Transmisión": "Cobre par trenzado UTP Categoría 6A (Chaqueta Azul LSZH)",
      "Canalización Oficina": "Canaleta superficial de PVC blanca de 60x40 mm",
      "Canalización Data Center": "Bandeja portacables y piso falso técnico elevado",
      "Longitud Promedio": "12 m - 24 m por punto de red (Cumple < 90m enlace permanente)"
    }
  }
};
