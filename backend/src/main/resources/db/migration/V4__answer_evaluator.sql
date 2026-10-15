-- Record which grader produced each answer's score so provisional (rule-based) grades can be reviewed.
ALTER TABLE answer ADD COLUMN evaluator varchar(20);
