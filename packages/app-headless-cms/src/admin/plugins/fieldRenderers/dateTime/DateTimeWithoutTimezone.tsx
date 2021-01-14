import React from "react";
import { Grid, Cell } from "@webiny/ui/Grid";
import { DEFAULT_DATE, DEFAULT_TIME, RemoveFieldButton } from "./utils";
import Input from "./Input";

const DateTimeWithoutTimezone = props => {
    // "2020-05-18 09:00:00"
    const [date, setDate] = React.useState("");
    const [time, setTime] = React.useState("");
    React.useEffect(() => {
        if (props.bind.value === null) {
            setDate(DEFAULT_DATE);
            setTime(DEFAULT_TIME);
            return;
        }
        const [isoDate, fullTime] = props.bind.value.split(" ");

        const formattedDate = isoDate;
        const formattedTime = fullTime;

        // Set previously saved values
        if (date !== formattedDate) {
            setDate(formattedDate);
        }
        if (time !== formattedTime) {
            setTime(formattedTime);
        }
    }, [props.bind.value]);

    const cellSize = props.trailingIcon ? 5 : 6;

    return (
        <Grid>
            <Cell span={6}>
                <Input
                    bind={{
                        ...props.bind,
                        value: date,
                        onChange: value => {
                            setDate(value);
                            return props.bind.onChange(`${value} ${time}`);
                        }
                    }}
                    field={{
                        ...props.field,
                        label: `${props.field.label} date`
                    }}
                    type={"date"}
                />
            </Cell>
            <Cell span={cellSize}>
                <Input
                    bind={{
                        ...props.bind,
                        value: time,
                        onChange: value => {
                            setTime(value);
                            return props.bind.onChange(`${date} ${value}`);
                        }
                    }}
                    field={{
                        ...props.field,
                        label: `${props.field.label} time`
                    }}
                    type={"time"}
                    step={5}
                />
            </Cell>
            <RemoveFieldButton trailingIcon={props.trailingIcon} />
        </Grid>
    );
};

export default DateTimeWithoutTimezone;
