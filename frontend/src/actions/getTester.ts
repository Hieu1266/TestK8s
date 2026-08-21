"use server";

import { getrList } from "@/actions/getUser";

export interface ActionResponseList {
    success: boolean;
    message?: string;
    list?: any[];
}

export async function getAllTesters(): Promise<ActionResponseList> {
    console.log("========== GET ALL TESTERS ==========");

    // Backend đã cho phép Manager gọi get-user-list
    // và truyền role_id=3 để lọc Tester
    const response = await getrList(1, 1000, 3);

    console.log("GET USER RESPONSE:", response);

    if (!response.success || !response.list) {
        console.log(
            "GET USER FAILED:",
            response.message
        );

        return response;
    }

    console.log(
        "TOTAL USERS:",
        response.list.length
    );

    response.list.forEach((u: any) => {
        console.log("CHECK USER:", {
            user_id: u.user_id,
            username: u.username,
            role_name: u.role_name,
        });
    });

    const testers = response.list.filter(
        (u: any) => u.role_name === "Tester"
    );

    console.log("========== TESTERS ==========");
    console.log("TESTER COUNT:", testers.length);
    console.log("TESTERS:", testers);

    return {
        success: true,
        list: testers,
    };
}