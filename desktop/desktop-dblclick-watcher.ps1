# Watch DeskBox widget visibility via WinEvent hook (real-time, no polling delay).
$src = @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class DeskBoxWatcher {
    public delegate void WinEventDelegate(IntPtr hWinEventHook, uint eventType, IntPtr hwnd,
        int idObject, int idChild, uint dwEventThread, uint dwmsEventTime);

    [DllImport("user32.dll")] public static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax,
        IntPtr hmodWinEventProc, WinEventDelegate lpfnWinEventProc, uint idProcess, uint idThread, uint dwFlags);
    [DllImport("user32.dll")] public static extern bool UnhookWinEvent(IntPtr hWinEventHook);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);

    const uint EVENT_OBJECT_SHOW = 0x8002;
    const uint EVENT_OBJECT_HIDE = 0x8003;
    const uint EVENT_OBJECT_DESTROY = 0x8001;
    const uint WINEVENT_OUTOFCONTEXT = 0;

    static WinEventDelegate _del = Callback;

    static void Callback(IntPtr h, uint evt, IntPtr hwnd, int idObject, int idChild, uint thread, uint time) {
        if (idObject != 0) return; // only window objects, not children
        var cls = new StringBuilder(256);
        GetClassName(hwnd, cls, 256);
        if (cls.ToString() != "WinUIDesktopWin32WindowClass") return;
        if (evt == EVENT_OBJECT_SHOW) {
            Console.WriteLine("DESKBOX_SHOWN");
        } else if (evt == EVENT_OBJECT_HIDE || evt == EVENT_OBJECT_DESTROY) {
            Console.WriteLine("DESKBOX_HIDDEN");
        }
        Console.Out.Flush();
    }

    public static void Start() {
        IntPtr hook = SetWinEventHook(EVENT_OBJECT_SHOW, EVENT_OBJECT_HIDE, IntPtr.Zero, _del, 0, 0, WINEVENT_OUTOFCONTEXT);
        // Also catch destroy
        IntPtr hook2 = SetWinEventHook(EVENT_OBJECT_DESTROY, EVENT_OBJECT_DESTROY, IntPtr.Zero, _del, 0, 0, WINEVENT_OUTOFCONTEXT);
        var t = new System.Windows.Forms.ApplicationContext();
        System.Windows.Forms.Application.Run(t);
        UnhookWinEvent(hook);
        UnhookWinEvent(hook2);
    }
}
"@
Add-Type -TypeDefinition $src -ReferencedAssemblies System.Windows.Forms
[DeskBoxWatcher]::Start()
