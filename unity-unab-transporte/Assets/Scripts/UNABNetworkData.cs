using System;
using System.Collections.Generic;
using UnityEngine;

namespace UNAB.Transporte3D
{
    [Serializable]
    public class EquipmentInfo
    {
        public string key;
        public string category;
        public string title;
        public string description;
        public List<SpecEntry> specs = new List<SpecEntry>();

        public void SetSpec(string label, string value)
        {
            for (int i = 0; i < specs.Count; i++)
            {
                if (specs[i].label == label)
                {
                    specs[i].value = value;
                    return;
                }
            }
            specs.Add(new SpecEntry { label = label, value = value });
        }
    }

    [Serializable]
    public class SpecEntry
    {
        public string label;
        public string value;
    }

    [Serializable]
    public class DnsRecord
    {
        public string domain;
        public string type;
        public string ip;
    }

    [Serializable]
    public class SwitchPortState
    {
        public string port;
        public string device;
        public string vlan;
        public string ip;
        public bool up;
        public string targetKey;
    }

    [Serializable]
    public class PcNodeState
    {
        public string key;
        public string hostname;
        public string mode; // "DHCP" or "Static"
        public string ip;
        public string mask;
        public string gateway;
        public string dns;
        public string mac;
        public string switchPort;
        public string cmdHistory = "";
    }

    [Serializable]
    public class BusUnitState
    {
        public string id;
        public string plate;
        public string route;
        public int speed;
        public int passengers;
        public int capacity;
        public string status;
        public float progress;
    }

    [Serializable]
    public class PrintJobEntry
    {
        public int id;
        public string doc;
        public string user;
        public int pages;
        public string time;
        public string state;
    }

    public class UNABInteractableTag : MonoBehaviour
    {
        public string dataKey;
    }

    public class UNABNetworkSimulator : MonoBehaviour
    {
        public static UNABNetworkSimulator Instance { get; private set; }

        public Dictionary<string, EquipmentInfo> EquipmentDB = new Dictionary<string, EquipmentInfo>();

        // Estado del Servidor Central (192.168.20.10)
        public string serverHostname = "srv-buses-unab";
        public string serverIp = "192.168.20.10";
        public string serverMask = "255.255.255.0";
        public string serverGateway = "192.168.20.1";
        public bool srvHttpGps = true;
        public bool srvPostgres = true;
        public bool srvDhcp = true;
        public bool srvDns = true;

        public string dhcpPoolName = "POOL_TRANSPORTE_UNAB";
        public string dhcpGateway = "192.168.20.1";
        public string dhcpDns = "192.168.20.10";
        public string dhcpStartIp = "192.168.20.101";
        public string dhcpMask = "255.255.255.0";

        public List<DnsRecord> dnsRecords = new List<DnsRecord>();

        // Estado del Router Gateway (192.168.20.1)
        public string routerHostname = "RTR-UNAB-TRANSPORTE";
        public string routerWanIp = "200.48.225.14";
        public string routerWanMask = "255.255.255.252";
        public string routerLanIp = "192.168.20.1";
        public string routerLanMask = "255.255.255.0";
        public bool routerWanUp = true;
        public bool routerLanUp = true;
        public string routerCliHistory = "";

        // Puertos del Switch Core (192.168.20.2)
        public List<SwitchPortState> switchPorts = new List<SwitchPortState>();

        // Las 3 Estaciones de Monitoreo y Administración
        public Dictionary<string, PcNodeState> pcs = new Dictionary<string, PcNodeState>();

        // Flota de Buses UNAB
        public List<BusUnitState> buses = new List<BusUnitState>();

        // Impresora Epson EcoTank (192.168.20.200)
        public string printerIp = "192.168.20.200";
        public string printerMask = "255.255.255.0";
        public string printerGw = "192.168.20.1";
        public int inkBk = 92, inkC = 84, inkM = 79, inkY = 88;
        public List<PrintJobEntry> printJobs = new List<PrintJobEntry>();

        // UPS 220V & Climatizador EDApower CRAC
        public string upsMode = "AC Normal (Doble Conversion)";
        public int upsInputV = 220;
        public int upsOutputV = 220;
        public int upsLoad = 34;
        public int upsBattery = 100;

        public bool cracPower = true;
        public float cracTargetTemp = 20.0f;
        public float cracCurrentTemp = 20.2f;
        public int cracHumidity = 46;

        private void Awake()
        {
            Instance = this;
            InitializeDatabase();
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            for (int i = 0; i < buses.Count; i++)
            {
                if (buses[i].status == "EN RUTA")
                {
                    buses[i].progress = (buses[i].progress + dt * 0.065f) % 1.0f;
                }
            }
        }

        public void InitializeDatabase()
        {
            EquipmentDB.Clear();

            AddEquipment("rack_main", "INFRAESTRUCTURA DE TELECOMUNICACIONES",
                "Gabinete / Rack Principal de Servidores (42U)",
                "Aloja el Servidor Central de geolocalizacion GPS de buses UNAB, Switch Administrable de 24 puertos, Patch Panels Cat6A, Router Gateway y PDU.",
                ("Ubicacion", "Cuarto de Telecomunicaciones (Zona Izquierda)"),
                ("Equipos Alojados", "Servidor GPS/BD, Switch 24P, Router WAN, 2 Patch Panels"),
                ("Estandar", "ANSI/TIA-942 / EIA-310-D (42U)"),
                ("Estado", "Operativo (Online)"));

            AddEquipment("ups_power", "RESPALDO ELECTRICO",
                "Banco de 3 UPS Online Doble Conversion (220V / 3000 VA)",
                "Sistema escalonado de 3 modulos UPS que garantiza energia continua de 220V sin microcortes para el Rack de Servidores ante apagones en el campus.",
                ("Capacidad", "3000 VA / 2700 W (220V)"),
                ("Autonomia", "45 minutos a carga media"),
                ("Proteccion", "Doble conversion online + AVR"),
                ("Baterias", "100% Cargadas"));

            AddEquipment("ac_unit", "CLIMATIZACION DE PRECISION",
                "Climatizador de Precision EDApower CRAC",
                "Unidad de control termico y humedad de precision con descarga hacia el piso falso tecnico del cuarto de servidores.",
                ("Temperatura Objetivo", "20.0 C +/- 1.0 C"),
                ("Humedad Relativa", "46%"),
                ("Inyeccion de Aire", "Hacia pasillo frio y piso tecnico"));

            AddEquipment("pc_monitor_1", "ESTACION DE MONITOREO 1",
                "PC Operador 1 - Mapa de Rutas de Buses en Tiempo Real",
                "Estacion de trabajo conectada por cable UTP Cat6A al Switch del cuarto de servidores. Visualiza el mapa en vivo con la ubicacion de los buses UNAB.",
                ("Hostname", "PC-MONITOREO-01"),
                ("Direccion IP", "192.168.20.101 (DHCP)"),
                ("Mascara / Gateway", "255.255.255.0 / 192.168.20.1"),
                ("Punto de Red", "Faceplate RJ45 - Canaleta Norte #01 (Switch Gi0/3)"));

            AddEquipment("pc_monitor_2", "ESTACION DE MONITOREO 2",
                "PC Operador 2 - Control de Salidas y Llegadas UNAB",
                "Segunda consola de supervision que monitorea los horarios de salida de los paraderos, tiempos estimados de llegada al campus y alertas.",
                ("Hostname", "PC-MONITOREO-02"),
                ("Direccion IP", "192.168.20.102 (DHCP)"),
                ("Mascara / Gateway", "255.255.255.0 / 192.168.20.1"),
                ("Punto de Red", "Faceplate RJ45 - Canaleta Norte #02 (Switch Gi0/4)"));

            AddEquipment("pc_admin", "ESTACION DE ADMINISTRACION",
                "PC Administracion de Servicios de Red y Despacho",
                "Estacion ubicada en la zona sur para administracion de red (CLI/SSH/Web), monitoreo de servicios (DNS, DHCP, HTTP) y despacho.",
                ("Hostname", "PC-ADMIN-RED"),
                ("Direccion IP", "192.168.20.103 (Static)"),
                ("Mascara / Gateway", "255.255.255.0 / 192.168.20.1"),
                ("Punto de Red", "Faceplate RJ45 - Canaleta Sur #03 (Switch Gi0/5)"));

            AddEquipment("printer_net", "PERIFERICO EN RED",
                "Impresora Multifuncional Epson EcoTank en Red",
                "Impresora conectada directamente a la red local mediante cable UTP Cat6A para imprimir reportes diarios de recorridos y bitacoras.",
                ("Direccion IP", "192.168.20.200 (IP Estatica)"),
                ("Protocolo", "TCP/IP Raw Port 9100 / IPP"),
                ("Punto de Red", "Toma RJ45 Pared Divisoria #04 (Switch Gi0/6)"));

            AddEquipment("structured_cabling", "CABLEADO ESTRUCTURADO Y CANALIZACION",
                "Bandejas Portacables de Techo + Canaletas de Pared (Cat6A)",
                "Recorrido continuo de cables UTP Cat6A que suben desde el Rack hacia las bandejas tipo escalerilla sobre el falso techo y bajan por canaletas hacia las PCs.",
                ("Medio de Transmision", "Cobre par trenzado UTP Categoria 6A LSZH"),
                ("Canalizacion Techo", "Bandeja tipo escalerilla metalica en plenum"),
                ("Canalizacion Pared", "Canaleta PVC blanca 60x40 mm con Faceplates RJ45"),
                ("Certificacion", "ANSI/TIA-568-C.2 (< 90m enlace permanente)"));

            AddEquipment("unab_bus_01", "FLOTA DE TRANSPORTE UNIVERSITARIO UNAB",
                "Bus Institucional UNAB #03 (Placa EUB-105 - Modulo GPS/LTE Activo)",
                "Unidad de transporte estudiantil de la Universidad Nacional de Barranca equipada con transceptor GPS/GNSS y modem celular 4G LTE que reporta telemetria en tiempo real al Servidor Central (192.168.20.10).",
                ("Ruta Asignada", "Ruta Centro: Plaza de Armas Barranca - Campus UNAB"),
                ("Telemetria GPS", "Enlace 4G LTE -> Gateway WAN 200.48.225.14 -> SRV-UNAB (192.168.20.10)"),
                ("Capacidad", "45 Pasajeros Sentados (Estudiantes / Docentes UNAB)"),
                ("Estado Actual", "Estacionado en Exterior Campus UNAB (Transmision GPS Online)"));

            AddEquipment("portico_unab", "CAMPUS UNIVERSIDAD NACIONAL DE BARRANCA",
                "Portico Principal de Ingreso y Mural Monumental de Caral",
                "Fachada institucional de la Universidad Nacional de Barranca (UNAB) con portico trapezoidal en piedra laja negra, Pabellon Central donde se ubica el Area de Transporte y el Mural de la Ciudad Sagrada de Caral.",
                ("Ubicacion", "Av. Toribio de Luzuriaga / Campus Principal UNAB - Barranca"),
                ("Pabellon Central", "1er Piso: Area de Transporte y Centro de Datos (Data Center)"),
                ("Patrimonio Cultural", "Mural Ciudad Sagrada de Caral - Primera Civilizacion de America"),
                ("Conectividad Campus", "Fibra Optica Monomodo + Red LAN Cat6A (192.168.20.0/24)"));

            dnsRecords = new List<DnsRecord>
            {
                new DnsRecord { domain = "gps.unab.edu.pe", type = "A", ip = "192.168.20.10" },
                new DnsRecord { domain = "srv-buses-unab.local", type = "A", ip = "192.168.20.10" },
                new DnsRecord { domain = "gateway.unab.local", type = "A", ip = "192.168.20.1" },
                new DnsRecord { domain = "impresora.unab.local", type = "A", ip = "192.168.20.200" }
            };

            switchPorts = new List<SwitchPortState>
            {
                new SwitchPortState { port = "Gi0/1", device = "Router Gateway (RTR-UNAB)", vlan = "VLAN 10 / Trunk", ip = "192.168.20.1", up = true, targetKey = "router_gateway" },
                new SwitchPortState { port = "Gi0/2", device = "Servidor GPS & BD (SRV-UNAB)", vlan = "VLAN 10 (Servidores)", ip = "192.168.20.10", up = true, targetKey = "server_gps" },
                new SwitchPortState { port = "Gi0/3", device = "PC Operador 1 (PC-MONITOREO-01)", vlan = "VLAN 20 (Monitoreo)", ip = "192.168.20.101", up = true, targetKey = "pc_monitor_1" },
                new SwitchPortState { port = "Gi0/4", device = "PC Operador 2 (PC-MONITOREO-02)", vlan = "VLAN 20 (Monitoreo)", ip = "192.168.20.102", up = true, targetKey = "pc_monitor_2" },
                new SwitchPortState { port = "Gi0/5", device = "PC Administracion (PC-ADMIN-RED)", vlan = "VLAN 30 (Gestion)", ip = "192.168.20.103", up = true, targetKey = "pc_admin" },
                new SwitchPortState { port = "Gi0/6", device = "Impresora Epson EcoTank", vlan = "VLAN 20 (Monitoreo)", ip = "192.168.20.200", up = true, targetKey = "printer_net" }
            };

            pcs["pc_monitor_1"] = new PcNodeState
            {
                key = "pc_monitor_1", hostname = "PC-MONITOREO-01", mode = "DHCP",
                ip = "192.168.20.101", mask = "255.255.255.0", gateway = "192.168.20.1", dns = "192.168.20.10",
                mac = "00:1A:2B:3C:4D:01", switchPort = "Gi0/3",
                cmdHistory = "UNAB Windows Command Processor [Version 10.0]\nEstacion: PC-MONITOREO-01\nEscribe 'help' o presiona un comando rapido arriba.\n"
            };
            pcs["pc_monitor_2"] = new PcNodeState
            {
                key = "pc_monitor_2", hostname = "PC-MONITOREO-02", mode = "DHCP",
                ip = "192.168.20.102", mask = "255.255.255.0", gateway = "192.168.20.1", dns = "192.168.20.10",
                mac = "00:1A:2B:3C:4D:02", switchPort = "Gi0/4",
                cmdHistory = "UNAB Windows Command Processor [Version 10.0]\nEstacion: PC-MONITOREO-02\nEscribe 'help' o presiona un comando rapido arriba.\n"
            };
            pcs["pc_admin"] = new PcNodeState
            {
                key = "pc_admin", hostname = "PC-ADMIN-RED", mode = "Static",
                ip = "192.168.20.103", mask = "255.255.255.0", gateway = "192.168.20.1", dns = "192.168.20.10",
                mac = "00:1A:2B:3C:4D:03", switchPort = "Gi0/5",
                cmdHistory = "UNAB Windows Command Processor [Version 10.0]\nEstacion: PC-ADMIN-RED\nEscribe 'help' o presiona un comando rapido arriba.\n"
            };

            buses = new List<BusUnitState>
            {
                new BusUnitState { id = "BUS-01", plate = "EUA-412", route = "Ruta Norte: Paramonga - Pativilca - Campus UNAB", speed = 48, passengers = 38, capacity = 45, status = "EN RUTA", progress = 0.25f },
                new BusUnitState { id = "BUS-02", plate = "EUA-819", route = "Ruta Sur: Supe Pueblo - Puerto Supe - Campus UNAB", speed = 42, passengers = 41, capacity = 45, status = "EN RUTA", progress = 0.62f },
                new BusUnitState { id = "BUS-03", plate = "EUB-105", route = "Ruta Centro: Plaza de Armas Barranca - Campus UNAB", speed = 0, passengers = 45, capacity = 45, status = "EN CAMPUS UNAB", progress = 0.92f }
            };

            printJobs = new List<PrintJobEntry>
            {
                new PrintJobEntry { id = 101, doc = "Reporte_Salidas_Manana_UNAB.pdf", user = "PC-MONITOREO-02", pages = 3, time = "07:45 AM", state = "Completado" },
                new PrintJobEntry { id = 102, doc = "Bitacora_Red_Transporte.pdf", user = "PC-ADMIN-RED", pages = 2, time = "08:10 AM", state = "Completado" }
            };

            routerCliHistory = "Cisco IOS Software, UNAB-Transporte Router/Switch Core (Version 15.6(3)M)\nPresiona un boton rapido arriba o escribe 'help'.\n";
        }

        private void AddEquipment(string key, string cat, string title, string desc, params (string, string)[] specPairs)
        {
            var info = new EquipmentInfo { key = key, category = cat, title = title, description = desc };
            foreach (var sp in specPairs)
            {
                info.specs.Add(new SpecEntry { label = sp.Item1, value = sp.Item2 });
            }
            EquipmentDB[key] = info;
        }

        public bool IsDeviceLinkUp(string key)
        {
            foreach (var p in switchPorts)
            {
                if (p.targetKey == key) return p.up;
            }
            return true;
        }

        public bool IsServerPortUp()
        {
            foreach (var p in switchPorts)
            {
                if (p.port == "Gi0/2") return p.up;
            }
            return true;
        }

        public string ResolveHost(string hostOrIp, out string error)
        {
            error = null;
            string clean = hostOrIp.Trim().ToLowerInvariant();
            string[] octets = clean.Split('.');
            if (octets.Length == 4 && int.TryParse(octets[0], out _))
            {
                return clean;
            }
            if (!srvDns || !IsServerPortUp())
            {
                error = "DNS_OFF";
                return null;
            }
            foreach (var rec in dnsRecords)
            {
                if (rec.domain.ToLowerInvariant() == clean) return rec.ip;
            }
            error = "NXDOMAIN";
            return null;
        }

        public bool IsIpReachable(string targetIp)
        {
            if (targetIp == serverIp && IsServerPortUp()) return true;
            if (targetIp == routerLanIp && routerLanUp) return true;
            if (targetIp == "192.168.20.2") return true;
            if (targetIp == printerIp && IsDeviceLinkUp("printer_net")) return true;
            foreach (var kv in pcs)
            {
                if (kv.Value.ip == targetIp && IsDeviceLinkUp(kv.Key)) return true;
            }
            return false;
        }

        public void RequestDhcpForPc(string pcKey, out string statusMsg)
        {
            if (!pcs.TryGetValue(pcKey, out var pc))
            {
                statusMsg = "PC no encontrada.";
                return;
            }
            pc.mode = "DHCP";
            if (srvDhcp && IsServerPortUp() && IsDeviceLinkUp(pcKey))
            {
                int host = pcKey == "pc_monitor_1" ? 101 : (pcKey == "pc_monitor_2" ? 102 : 103);
                pc.ip = $"192.168.20.{host}";
                pc.mask = dhcpMask;
                pc.gateway = dhcpGateway;
                pc.dns = dhcpDns;
                statusMsg = "DHCP request successful (Asignado por 192.168.20.10).";
            }
            else
            {
                pc.ip = $"169.254.{UnityEngine.Random.Range(10, 240)}.{UnityEngine.Random.Range(10, 240)}";
                pc.mask = "255.255.0.0";
                pc.gateway = "0.0.0.0";
                statusMsg = "DHCP failed. APIPA is being used (Verifica el servicio DHCP del Servidor).";
            }
            SyncPcSpecs(pcKey);
        }

        public void SyncPcSpecs(string pcKey)
        {
            if (pcs.TryGetValue(pcKey, out var pc) && EquipmentDB.TryGetValue(pcKey, out var info))
            {
                info.SetSpec("Direccion IP", $"{pc.ip} ({pc.mode})");
                info.SetSpec("Mascara / Gateway", $"{pc.mask} / {pc.gateway}");
            }
        }

        public void ExecutePcCommand(string pcKey, string rawCmd)
        {
            if (!pcs.TryGetValue(pcKey, out var pc)) return;
            string cmdLine = rawCmd.Trim();
            if (string.IsNullOrEmpty(cmdLine)) return;

            pc.cmdHistory += $"\nC:\\Users\\{pc.hostname}> {cmdLine}\n";
            string[] parts = cmdLine.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            string cmd = parts[0].ToLowerInvariant();
            string arg = parts.Length > 1 ? parts[1] : "";

            if (cmd == "cls" || cmd == "clear")
            {
                pc.cmdHistory = "";
                return;
            }
            if (cmd == "help")
            {
                pc.cmdHistory += "Comandos disponibles:\n  ipconfig [/all]      Configuracion IPv4, MAC y DNS\n  ping <ip|dominio>    Envia 4 paquetes ICMP Echo Request\n  nslookup <dominio>   Consulta el servidor DNS (192.168.20.10)\n  tracert <ip>         Traza la ruta hacia el destino\n  arp -a               Muestra tabla ARP\n  cls                  Limpia la terminal\n";
                return;
            }
            if (cmd == "ipconfig")
            {
                string link = IsDeviceLinkUp(pcKey) ? "Conectado (1 Gbps Full Duplex)" : "Medios desconectados (Puerto Switch DOWN)";
                pc.cmdHistory += $"Configuracion IP de Windows ({pc.hostname})\n  Estado del enlace : {link}\n  Modo asignacion   : {pc.mode}\n  Direccion MAC     : {pc.mac}\n  Direccion IPv4    : {pc.ip}\n  Mascara de subred : {pc.mask}\n  Puerta de enlace  : {pc.gateway}\n  Servidor DNS      : {pc.dns}\n";
                return;
            }
            if (cmd == "arp")
            {
                pc.cmdHistory += $"Interfaz: {pc.ip} --- 0x1\n  Direccion de Internet    Direccion fisica      Tipo\n  192.168.20.1             00-90-2b-a1-10-01     dinamico\n  192.168.20.10            00-e0-4c-68-20-10     dinamico\n  192.168.20.200           00-26-ab-7c-40-99     dinamico\n";
                return;
            }
            if (cmd == "nslookup")
            {
                if (string.IsNullOrEmpty(arg))
                {
                    pc.cmdHistory += "Uso: nslookup <dominio> (ej. nslookup gps.unab.edu.pe)\n";
                    return;
                }
                string ip = ResolveHost(arg, out string err);
                if (!string.IsNullOrEmpty(ip))
                    pc.cmdHistory += $"Servidor: srv-buses-unab.local ({pc.dns})\nNombre:   {arg}\nAddress:  {ip}\n";
                else if (err == "DNS_OFF")
                    pc.cmdHistory += $"DNS request timed out. El servicio DNS en {pc.dns} esta apagado.\n";
                else
                    pc.cmdHistory += $"*** {pc.dns} no encuentra {arg}: Non-existent domain.\n";
                return;
            }
            if (cmd == "ping" || cmd == "tracert")
            {
                if (string.IsNullOrEmpty(arg))
                {
                    pc.cmdHistory += $"Uso: {cmd} <direccion IP o dominio>\n";
                    return;
                }
                if (!IsDeviceLinkUp(pcKey))
                {
                    pc.cmdHistory += $"PING: fallo de transmision. El puerto {pc.switchPort} del Switch esta en estado DOWN.\n";
                    return;
                }
                string ip = ResolveHost(arg, out string err);
                if (string.IsNullOrEmpty(ip))
                {
                    pc.cmdHistory += err == "DNS_OFF"
                        ? $"La solicitud de ping no pudo encontrar el host {arg} (Servicio DNS en 192.168.20.10 apagado).\n"
                        : $"La solicitud de ping no pudo encontrar el host {arg}.\n";
                    return;
                }
                bool ok = pc.ip.StartsWith("192.168.20.") && ip.StartsWith("192.168.20.") && IsIpReachable(ip);
                if (ok)
                {
                    pc.cmdHistory += $"Haciendo ping a {arg} [{ip}] con 32 bytes de datos:\nRespuesta desde {ip}: bytes=32 tiempo<1m TTL=64\nRespuesta desde {ip}: bytes=32 tiempo=1ms TTL=64\nRespuesta desde {ip}: bytes=32 tiempo<1m TTL=64\nRespuesta desde {ip}: bytes=32 tiempo=1ms TTL=64\nPaquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% perdidos)\n";
                }
                else
                {
                    pc.cmdHistory += $"Haciendo ping a {arg} [{ip}] con 32 bytes de datos:\nTiempo de espera agotado para esta solicitud.\nPaquetes: enviados = 4, recibidos = 0, perdidos = 4 (100% perdidos)\n";
                }
                return;
            }
            pc.cmdHistory += $"'{cmd}' no se reconoce como un comando. Escribe 'help'.\n";
        }

        public void ExecuteRouterCli(string rawCmd)
        {
            string cmd = rawCmd.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(cmd)) return;
            routerCliHistory += $"\n{routerHostname}# {rawCmd.Trim()}\n";

            if (cmd == "clear" || cmd == "cls")
            {
                routerCliHistory = "";
                return;
            }
            if (cmd == "help" || cmd == "?")
            {
                routerCliHistory += "Comandos Cisco IOS disponibles:\n  show ip interface brief\n  show vlan brief\n  show running-config\n  show ip route\n  show ip dhcp binding\n  clear\n";
            }
            else if (cmd.Contains("interface brief"))
            {
                routerCliHistory += $"Interface              IP-Address       OK? Method Status                Protocol\n";
                routerCliHistory += $"GigabitEthernet0/0     {routerWanIp,-16} YES NVRAM  {(routerWanUp ? "up" : "down"),-21} {(routerWanUp ? "up" : "down")}\n";
                routerCliHistory += $"GigabitEthernet0/1     {routerLanIp,-16} YES NVRAM  {(routerLanUp ? "up" : "down"),-21} {(routerLanUp ? "up" : "down")}\n";
                foreach (var sp in switchPorts)
                {
                    string st = sp.up ? "up" : "administratively down";
                    string pr = sp.up ? "up" : "down";
                    routerCliHistory += $"{sp.port,-22} {sp.ip,-16} YES manual {st,-21} {pr}\n";
                }
            }
            else if (cmd.Contains("vlan"))
            {
                routerCliHistory += "VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------\n1    default                          active    Gi0/7-24\n10   SERVIDORES_TRANSPORTE            active    Gi0/1, Gi0/2\n20   MONITOREO_GPS_BUSES              active    Gi0/3, Gi0/4, Gi0/6\n30   GESTION_RED_TI                   active    Gi0/5\n";
            }
            else if (cmd.Contains("running-config"))
            {
                routerCliHistory += $"Building configuration...\nhostname {routerHostname}\n!\nip dhcp pool {dhcpPoolName}\n network 192.168.20.0 255.255.255.0\n default-router {routerLanIp}\n dns-server {serverIp}\n!\ninterface GigabitEthernet0/0\n ip address {routerWanIp} {routerWanMask}\n ip nat outside\n!\ninterface GigabitEthernet0/1\n ip address {routerLanIp} {routerLanMask}\n ip nat inside\n!\nip nat inside source static udp {serverIp} 5055 interface GigabitEthernet0/0 5055\nend\n";
            }
            else if (cmd.Contains("route"))
            {
                routerCliHistory += $"C    192.168.20.0/24 is directly connected, GigabitEthernet0/1\nC    200.48.225.12/30 is directly connected, GigabitEthernet0/0\nS*   0.0.0.0/0 [1/0] via 200.48.225.13\n";
            }
            else if (cmd.Contains("dhcp"))
            {
                routerCliHistory += "IP address       Hardware address     Lease expiration   Type\n";
                foreach (var kv in pcs)
                {
                    routerCliHistory += $"{kv.Value.ip,-16} {kv.Value.mac,-20} Infinite           {kv.Value.mode}\n";
                }
            }
            else
            {
                routerCliHistory += "% Invalid input detected. Type 'help' for commands.\n";
            }
        }
    }
}
