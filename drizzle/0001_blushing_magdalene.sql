CREATE TABLE `simulation_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`total_transactions` int NOT NULL,
	`total_roi` int NOT NULL,
	`authorize_count` int NOT NULL,
	`analyze_count` int NOT NULL,
	`block_count` int NOT NULL,
	`avg_ir` varchar(10) NOT NULL,
	`avg_ciz` varchar(10) NOT NULL,
	`avg_dts` varchar(10) NOT NULL,
	`avg_tsg` varchar(10) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenario_name` varchar(128) NOT NULL,
	`decision` enum('AUTORISER','ANALYSER','BLOQUER') NOT NULL,
	`reason` text NOT NULL,
	`ir` varchar(10) NOT NULL,
	`ciz` varchar(10) NOT NULL,
	`dts` varchar(10) NOT NULL,
	`tsg` varchar(10) NOT NULL,
	`time_is_law` varchar(10) NOT NULL,
	`absolute_hold_gate` varchar(10) NOT NULL,
	`zero_tolerance_flag` varchar(10) NOT NULL,
	`irreversibility_index` varchar(10) NOT NULL,
	`conflict_zone_isolation` varchar(10) NOT NULL,
	`decision_time_sensitivity` varchar(10) NOT NULL,
	`total_system_guard` varchar(10) NOT NULL,
	`negative_memory_reflexes` varchar(10) NOT NULL,
	`emergent_behavior_watch` varchar(10) NOT NULL,
	`roi_contribution` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `simulation_sessions` ADD CONSTRAINT `simulation_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;