using UnityEditor;
using UnityEngine;
using UNAB.Transporte3D;

namespace UNAB.Transporte3D.EditorTools
{
    public static class UNABMenuDiagnostics
    {
        [MenuItem("UNAB Transporte/Diagnosticar y Forzar Menu Visible", false, 0)]
        public static void DiagnoseAndForceMenu()
        {
            var root = GameObject.Find("UNAB_Transporte_Root");
            if (root == null)
            {
                EditorUtility.DisplayDialog("Diagnóstico", "No se encontró el objeto 'UNAB_Transporte_Root' en la escena.", "OK");
                return;
            }

            var ctrl = root.GetComponent<UNABSceneController>();
            var sim = root.GetComponent<UNABNetworkSimulator>();
            var hud = root.GetComponent<UNABHudAndConsoleUI>();

            if (ctrl == null) ctrl = root.AddComponent<UNABSceneController>();
            if (sim == null) sim = root.AddComponent<UNABNetworkSimulator>();
            if (hud == null) hud = root.AddComponent<UNABHudAndConsoleUI>();

            ctrl.enabled = true;
            sim.enabled = true;
            hud.enabled = true;
            root.SetActive(true);

            // Forzar actualización de escena
            EditorUtility.SetDirty(root);
            EditorUtility.SetDirty(hud);

            EditorUtility.DisplayDialog("Diagnóstico Completado",
                "Componentes verificados y activados correctamente:\n" +
                $"- UNABSceneController: {(ctrl.enabled ? "Activo" : "Inactivo")}\n" +
                $"- UNABNetworkSimulator: {(sim.enabled ? "Activo" : "Inactivo")}\n" +
                $"- UNABHudAndConsoleUI: {(hud.enabled ? "Activo" : "Inactivo")}\n\n" +
                "Ahora presiona PLAY (▶) para que la interfaz se ejecute en vivo con Oliver Atom.",
                "Entendido");
        }
    }
}
