import { z } from "zod";

export const task = z.object({
        id: z.number().int(),
        name: z.string().trim().min(1, "Name cannot be empty"),
        slug: z
                .string()
                .trim()
                .min(1, "Slug cannot be empty")
                .regex(/^[a-z0-9-]+$/i, "Slug must be alphanumeric with optional dashes"),
        description: z.string().trim().min(1, "Description cannot be empty"),
        completed: z.boolean(),
        due_date: z.string().trim().datetime(),
});

export const TaskModel = {
	tableName: "tasks",
	primaryKeys: ["id"],
	schema: task,
	serializer: (obj: Record<string, string | number | boolean>) => {
		return {
			...obj,
			completed: Boolean(obj.completed),
		};
	},
	serializerObject: task,
};
