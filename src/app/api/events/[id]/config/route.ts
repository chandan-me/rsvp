import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { authService } from "@/lib/services/authService";
import { auditService } from "@/lib/services/auditService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authService.getSessionUser(req);
    const authCheck = await authService.authorizeEvent(user, id);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const config = await eventService.getEventFullConfig(id);
    return NextResponse.json({
      success: true,
      eventId: id,
      config,
      modules: config.modules,
      gates: config.gates,
      areas: config.areas,
      sections: config.sections,
      passTypes: config.passTypes,
      foodCategories: config.foodCategories,
      accessRules: config.accessRules,
      staff: config.staff,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load event configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authService.getSessionUser(req);
    const authCheck = await authService.authorizeEvent(user, id, "client");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { modules, gates, areas, sections, passTypes, foodCategories, accessRules } = body;

    if (modules && Array.isArray(modules)) {
      await eventService.updateEventModules(id, modules);
    }
    if (gates && Array.isArray(gates)) {
      for (const g of gates) {
        await eventService.createEventGate(id, g);
      }
    }
    if (areas && Array.isArray(areas)) {
      for (const a of areas) {
        await eventService.createEventArea(id, a);
      }
    }
    if (sections && Array.isArray(sections)) {
      for (const s of sections) {
        await eventService.createEventSection(id, s);
      }
    }
    if (passTypes && Array.isArray(passTypes)) {
      for (const p of passTypes) {
        await eventService.createEventPassType(id, p);
      }
    }
    if (foodCategories && Array.isArray(foodCategories)) {
      for (const f of foodCategories) {
        await eventService.createEventFoodCategory(id, f);
      }
    }
    if (accessRules && Array.isArray(accessRules)) {
      await eventService.saveEventAccessRules(id, accessRules);
    }

    await auditService.log({
      eventId: id,
      actorId: user?.id || "unknown",
      actorRole: user?.role,
      action: "event.config_updated",
      resourceType: "event_config",
      resourceId: id,
      newValues: { modulesCount: modules?.length, rulesCount: accessRules?.length },
    });

    const updatedConfig = await eventService.getEventFullConfig(id);
    return NextResponse.json({
      success: true,
      message: "Event configuration updated successfully",
      config: updatedConfig,
      modules: updatedConfig.modules,
      gates: updatedConfig.gates,
      areas: updatedConfig.areas,
      sections: updatedConfig.sections,
      passTypes: updatedConfig.passTypes,
      foodCategories: updatedConfig.foodCategories,
      accessRules: updatedConfig.accessRules,
      staff: updatedConfig.staff,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update event configuration" },
      { status: 500 }
    );
  }
}
